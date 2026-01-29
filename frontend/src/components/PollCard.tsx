import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Poll } from '../types';
import { useVote, usePollDetail } from '../hooks/usePolls';
import { generateFingerprint } from '../lib/fingerprint';
import { saveVote, getVote } from '../lib/voteStorage';
import ExpirationTimer from './ExpirationTimer';

interface PollCardProps {
  poll: Poll;
}

const CATEGORY_LABELS: Record<string, string> = {
  politics: '정치',
  society: '사회',
  life: '라이프',
  food: '음식',
  entertainment: '연예',
  sports: '스포츠',
  tech: '기술',
  economy: '경제',
  fun: '재미',
  other: '기타',
};

const PollCard = ({ poll }: PollCardProps) => {
  const storedVote = getVote(poll.id);
  const hasStoredVote = storedVote !== null;

  const [voted, setVoted] = useState(hasStoredVote);
  const [selectedOption, setSelectedOption] = useState<number | null>(storedVote);
  const [justVoted, setJustVoted] = useState(false);
  const [results, setResults] = useState<
    { count: number; percentage: number }[] | null
  >(null);

  const { mutateAsync: vote, isPending } = useVote(poll.id);

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
    if (voted || isPending) return;

    try {
      const fingerprint = await generateFingerprint();
      const response = await vote({ optionIndex, fingerprint });

      // Save to localStorage
      saveVote(poll.id, optionIndex);

      setVoted(true);
      setSelectedOption(optionIndex);
      setJustVoted(true);
      setResults(
        response.data.options.map((opt) => ({
          count: opt.count,
          percentage: opt.percentage,
        })),
      );

      // Remove animation class after animation completes
      setTimeout(() => setJustVoted(false), 500);
    } catch (err) {
      const error = err as Error & { code?: string };
      if (error.code === 'DUPLICATE_VOTE') {
        // User has voted but wasn't in localStorage - save it now
        saveVote(poll.id, optionIndex);
        setVoted(true);
        setSelectedOption(optionIndex);
        alert('이미 투표한 설문입니다.');
      } else {
        alert('투표 중 오류가 발생했습니다.');
      }
    }
  };

  const isExpired = poll.expiresAt ? new Date(poll.expiresAt) < new Date() : false;
  const showResults = voted && results !== null;
  const isLoadingResults = voted && results === null && isLoadingDetail;

  return (
    <div className="poll-card">
      <div className="poll-card-header">
        {poll.category && (
          <span className="poll-category">
            {CATEGORY_LABELS[poll.category] || poll.category}
          </span>
        )}
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
            disabled={voted || isPending || isExpired}
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
    </div>
  );
};

export default PollCard;
