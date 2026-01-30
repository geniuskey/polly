import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { Poll } from '../types';
import { useVote, usePollDetail } from '../hooks/usePolls';
import { generateFingerprint } from '../lib/fingerprint';
import { saveVote, getVote } from '../lib/voteStorage';
import { apiClient, type PollSimilarity } from '../lib/api';
import ExpirationTimer from './ExpirationTimer';

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
  currentTotal: number
) => {
  const newTotal = currentTotal + 1;
  return Array.from({ length: optionCount }, (_, i) => ({
    count: i === selectedIndex ? 1 : 0,
    percentage: i === selectedIndex ? (1 / newTotal) * 100 : 0,
  }));
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
      poll.responseCount
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

  const isExpired = poll.expiresAt ? new Date(poll.expiresAt) < new Date() : false;
  const showResults = voted && results !== null;
  const isLoadingResults = voted && results === null && isLoadingDetail;

  return (
    <div className="poll-card" ref={cardRef}>
      <div className="poll-card-header">
        <div className="poll-tags">
          {poll.tags?.map((tag) => (
            <span key={tag} className="poll-tag">#{tag}</span>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {poll.expiresAt && <ExpirationTimer expiresAt={poll.expiresAt} />}
          <span className="poll-responses">{poll.responseCount}명 참여</span>
        </div>
      </div>

      <Link to={`/poll/${poll.id}`} className="poll-question-link">
        <h3 className="poll-question">{poll.question}</h3>
      </Link>

      <div className="poll-options">
        {poll.options.map((option, index) => (
          <button
            key={index}
            className={`poll-option ${voted ? 'voted' : ''} ${selectedOption === index ? 'selected' : ''} ${justVoted && selectedOption === index ? 'just-voted' : ''}`}
            onClick={() => handleVote(index)}
            disabled={voted || isExpired}
          >
            <span className="option-text">
              {selectedOption === index && voted && (
                <span className="my-vote-badge">내 선택</span>
              )}
              {option}
            </span>
            {showResults && results[index] && (
              <div className="option-result">
                <div
                  className="option-bar"
                  style={{ width: `${results[index].percentage}%` }}
                />
                <span className="option-percentage">
                  {results[index].percentage.toFixed(1)}%
                </span>
              </div>
            )}
            {isLoadingResults && (
              <span className="option-percentage" style={{ opacity: 0.5 }}>
                로딩...
              </span>
            )}
          </button>
        ))}
      </div>

      {similarity?.message && (
        <div className="similarity-message">
          <span className="similarity-icon">👥</span>
          {similarity.message}
        </div>
      )}
    </div>
  );
};

export default PollCard;
