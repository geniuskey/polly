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
  const [voted, setVoted] = useState(storedVote !== null);
  const [selectedOption, setSelectedOption] = useState<number | null>(storedVote);
  const [justVoted, setJustVoted] = useState(false);
  const [results, setResults] = useState<
    { count: number; percentage: number }[] | null
  >(null);

  const { mutateAsync: vote, isPending } = useVote(poll.id);

  // Fetch poll detail to get results if already voted
  const { data: pollDetail } = usePollDetail(poll.id, storedVote !== null);

  // Load results from poll detail if already voted
  useEffect(() => {
    if (storedVote !== null && pollDetail?.data?.results) {
      setResults(
        pollDetail.data.results.options.map((opt) => ({
          count: opt.count,
          percentage: opt.percentage,
        }))
      );
    }
  }, [storedVote, pollDetail]);

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
        // User has voted before but it wasn't in localStorage
        // Try to get their vote from server or just show alert
        alert('이미 투표한 설문입니다.');
      } else {
        alert('투표 중 오류가 발생했습니다.');
      }
    }
  };

  const isExpired = poll.expiresAt ? new Date(poll.expiresAt) < new Date() : false;

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
            {results && (
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
          </button>
        ))}
      </div>
    </div>
  );
};

export default PollCard;
