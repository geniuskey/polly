import { useState } from 'react';
import type { Poll } from '../types';
import { useVote } from '../hooks/usePolls';
import { generateFingerprint } from '../lib/fingerprint';

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
  const [voted, setVoted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [results, setResults] = useState<
    { count: number; percentage: number }[] | null
  >(null);
  const { mutateAsync: vote, isPending } = useVote(poll.id);

  const handleVote = async (optionIndex: number) => {
    if (voted || isPending) return;

    try {
      const fingerprint = await generateFingerprint();
      const response = await vote({ optionIndex, fingerprint });
      setVoted(true);
      setSelectedOption(optionIndex);
      setResults(
        response.data.options.map((opt) => ({
          count: opt.count,
          percentage: opt.percentage,
        })),
      );
    } catch (err) {
      const error = err as Error & { code?: string };
      if (error.code === 'DUPLICATE_VOTE') {
        alert('이미 투표한 설문입니다.');
      } else {
        alert('투표 중 오류가 발생했습니다.');
      }
    }
  };

  return (
    <div className="poll-card">
      <div className="poll-card-header">
        {poll.category && (
          <span className="poll-category">
            {CATEGORY_LABELS[poll.category] || poll.category}
          </span>
        )}
        <span className="poll-responses">{poll.responseCount}명 참여</span>
      </div>

      <h3 className="poll-question">{poll.question}</h3>

      <div className="poll-options">
        {poll.options.map((option, index) => (
          <button
            key={index}
            className={`poll-option ${voted ? 'voted' : ''} ${selectedOption === index ? 'selected' : ''}`}
            onClick={() => handleVote(index)}
            disabled={voted || isPending}
          >
            <span className="option-text">{option}</span>
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
