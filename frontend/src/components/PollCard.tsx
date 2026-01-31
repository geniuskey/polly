import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { Poll } from '../types';
import { useVote, usePollDetail } from '../hooks/usePolls';
import { generateFingerprint } from '../lib/fingerprint';
import { saveVote, getVote } from '../lib/voteStorage';
import { apiClient, type PollSimilarity } from '../lib/api';
import ExpirationTimer from './ExpirationTimer';
import ShareCard from './ShareCard';

interface PollCardProps {
  poll: Poll;
}

const scrollToNextCard = (currentCard: HTMLElement) => {
  const nextCard = currentCard.nextElementSibling as HTMLElement | null;
  if (nextCard) {
    setTimeout(() => {
      nextCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 400);
  }
};

// Calculate optimistic results before API returns
const calculateOptimisticResults = (
  optionCount: number,
  selectedIndex: number,
  currentTotal: number,
  previewPercentages?: number[]
) => {
  const newTotal = currentTotal + 1;

  // If we have preview data, adjust percentages based on new vote
  if (previewPercentages && previewPercentages.length === optionCount) {
    const oldCounts = previewPercentages.map((p) => Math.round((p / 100) * currentTotal));
    oldCounts[selectedIndex] = (oldCounts[selectedIndex] || 0) + 1;

    return oldCounts.map((count) => ({
      count,
      percentage: (count / newTotal) * 100,
    }));
  }

  return Array.from({ length: optionCount }, (_, i) => ({
    count: i === selectedIndex ? 1 : 0,
    percentage: i === selectedIndex ? (1 / newTotal) * 100 : 0,
  }));
};

const formatCount = (count: number): string => {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}만`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}천`;
  }
  return String(count);
};

const PollCard = ({ poll }: PollCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const storedVote = getVote(poll.id);
  const hasStoredVote = storedVote !== null;

  const [voted, setVoted] = useState(hasStoredVote);
  const [selectedOption, setSelectedOption] = useState<number | null>(storedVote);
  const [justVoted, setJustVoted] = useState(false);
  const [results, setResults] = useState<
    { count: number; percentage: number }[] | null
  >(null);
  const [similarity, setSimilarity] = useState<PollSimilarity | null>(null);
  const [showShareCard, setShowShareCard] = useState(false);

  const { mutateAsync: vote } = useVote(poll.id);

  // Always fetch poll detail if user has voted to get latest results
  const { data: pollDetail, isLoading: isLoadingDetail } = usePollDetail(poll.id, hasStoredVote);

  // Set results from poll detail when data arrives
  useEffect(() => {
    if (hasStoredVote && pollDetail?.data?.results) {
      setResults(
        pollDetail.data.results.options.map((opt) => ({
          count: opt.count,
          percentage: opt.percentage,
        }))
      );
    }
  }, [hasStoredVote, pollDetail]);

  const handleVote = async (optionIndex: number) => {
    if (voted) return;

    // Optimistic UI: Update immediately
    setVoted(true);
    setSelectedOption(optionIndex);
    setJustVoted(true);
    saveVote(poll.id, optionIndex);

    // Show optimistic results immediately
    setResults(calculateOptimisticResults(
      poll.options.length,
      optionIndex,
      poll.responseCount,
      poll.results?.percentages
    ));

    // Auto-scroll to next card
    if (cardRef.current) {
      scrollToNextCard(cardRef.current);
    }

    // Remove animation class after animation completes
    setTimeout(() => setJustVoted(false), 500);

    // Background API call
    try {
      const fingerprint = await generateFingerprint();
      const response = await vote({ optionIndex, fingerprint });

      // Update with real results
      setResults(
        response.data.options.map((opt) => ({
          count: opt.count,
          percentage: opt.percentage,
        }))
      );

      // Check similarity (non-blocking)
      apiClient.checkSimilarity({
        fingerprint,
        pollId: poll.id,
        optionIndex,
      }).then((res) => {
        if (res.data?.message) {
          setSimilarity(res.data);
        }
      }).catch(() => {
        // Ignore similarity errors
      });
    } catch (err) {
      const error = err as Error & { code?: string };
      if (error.code === 'DUPLICATE_VOTE') {
        // Already voted - keep the UI state, just don't show error
      } else {
        // Revert on error
        setVoted(false);
        setSelectedOption(null);
        setResults(null);
        console.error('Vote failed:', error);
      }
    }
  };

  const handleShare = () => {
    setShowShareCard(true);
  };

  const isExpired = poll.expiresAt ? new Date(poll.expiresAt) < new Date() : false;
  const showResults = voted && results !== null;
  const isLoadingResults = voted && results === null && isLoadingDetail;

  // Preview results from list API (before voting)
  const previewPercentages = poll.results?.percentages || [];
  const hasPreview = previewPercentages.length > 0 && poll.responseCount > 0;

  // Get user's position after voting
  const myPercentage = selectedOption !== null && results
    ? results[selectedOption]?.percentage || 0
    : 0;

  return (
    <div className="poll-card" ref={cardRef}>
      <div className="poll-card-header">
        <div className="poll-tags">
          {poll.tags?.map((tag) => (
            <Link key={tag} to={`/?tag=${tag}`} className="poll-tag">#{tag}</Link>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {poll.expiresAt && <ExpirationTimer expiresAt={poll.expiresAt} />}
          <span className="poll-responses">
            <span className="live-dot" />
            {formatCount(poll.responseCount)}명 참여
          </span>
        </div>
      </div>

      <Link to={`/poll/${poll.id}`} className="poll-question-link">
        <h3 className="poll-question">{poll.question}</h3>
      </Link>

      <div className="poll-options">
        {poll.options.map((option, index) => {
          const previewPct = hasPreview ? previewPercentages[index] || 0 : 0;
          const resultPct = results?.[index]?.percentage || 0;
          const displayPct = voted ? resultPct : previewPct;

          return (
            <button
              key={index}
              className={`poll-option ${voted ? 'voted' : 'preview'} ${selectedOption === index ? 'selected' : ''} ${justVoted && selectedOption === index ? 'just-voted' : ''}`}
              onClick={() => handleVote(index)}
              disabled={voted || isExpired}
            >
              {/* Preview/Result bar */}
              {(hasPreview || showResults) && (
                <div
                  className={`option-bar ${voted ? 'voted' : 'preview'}`}
                  style={{ width: `${displayPct}%` }}
                />
              )}

              <span className="option-text">
                {selectedOption === index && voted && (
                  <span className="my-vote-badge">내 선택</span>
                )}
                {option}
              </span>

              {/* Show percentages */}
              {hasPreview && !voted && (
                <span className="option-percentage preview">
                  {previewPct}%
                </span>
              )}
              {showResults && results[index] && (
                <span className="option-percentage">
                  {results[index].percentage.toFixed(1)}%
                </span>
              )}
              {isLoadingResults && (
                <span className="option-percentage" style={{ opacity: 0.5 }}>
                  로딩...
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Vote CTA for preview mode */}
      {hasPreview && !voted && !isExpired && (
        <p className="vote-cta">
          선택하고 내 위치 확인하기 →
        </p>
      )}

      {/* Post-vote actions */}
      {voted && (
        <div className="poll-card-footer">
          {similarity?.message && (
            <div className="similarity-message">
              <span className="similarity-icon">👥</span>
              {similarity.message}
            </div>
          )}

          <div className="poll-actions">
            <Link to={`/poll/${poll.id}`} className="poll-action-btn comments">
              💬 댓글
            </Link>
            <button className="poll-action-btn share" onClick={handleShare}>
              🔗 공유하기
            </button>
          </div>
        </div>
      )}

      {/* Share card modal */}
      {showShareCard && selectedOption !== null && (
        <div className="share-card-overlay" onClick={() => setShowShareCard(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <ShareCard
              pollId={poll.id}
              question={poll.question}
              selectedOption={poll.options[selectedOption]}
              percentage={myPercentage}
              totalVotes={poll.responseCount + 1}
              onClose={() => setShowShareCard(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PollCard;
