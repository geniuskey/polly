import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePoll, useVote } from '../hooks/usePolls';
import { generateFingerprint } from '../lib/fingerprint';
import Results from '../components/Results';
import ShareButtons from '../components/ShareButtons';
import { DetailSkeleton } from '../components/Skeleton';

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

const PollDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = usePoll(id!);
  const { mutateAsync: vote, isPending } = useVote(id!);
  const [voted, setVoted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  if (isLoading) return <DetailSkeleton />;
  if (isError || !data) {
    return (
      <div className="error-state">
        <p>설문을 불러오는 데 실패했습니다.</p>
        <button className="retry-btn" onClick={() => refetch()}>
          다시 시도
        </button>
        <Link to="/" className="back-link">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  const poll = data.data;
  const hasVoted = voted || (poll.results.total > 0 && poll.myVote != null);

  const handleVote = async (optionIndex: number) => {
    if (hasVoted || isPending) return;
    try {
      const fingerprint = await generateFingerprint();
      await vote({ optionIndex, fingerprint });
      setVoted(true);
      setSelectedOption(optionIndex);
      refetch();
    } catch (err) {
      const error = err as Error & { code?: string };
      if (error.code === 'DUPLICATE_VOTE') {
        setVoted(true);
        refetch();
      } else if (error.code === 'POLL_EXPIRED') {
        alert('마감된 설문입니다.');
      } else {
        alert('투표 중 오류가 발생했습니다.');
      }
    }
  };

  const effectiveSelected = selectedOption ?? poll.myVote ?? null;

  return (
    <div className="poll-detail">
      <Link to="/" className="back-link">&larr; 목록으로</Link>

      <div className="poll-card">
        <div className="poll-card-header">
          {poll.category && (
            <span className="poll-category">
              {CATEGORY_LABELS[poll.category] || poll.category}
            </span>
          )}
          <span className="poll-responses">{poll.results.total}명 참여</span>
        </div>

        <h2 className="poll-question">{poll.question}</h2>

        {poll.expiresAt && (
          <div className="poll-expires">
            마감: {new Date(poll.expiresAt).toLocaleDateString('ko-KR')}
          </div>
        )}

        <div className="poll-options">
          {poll.options.map((option, index) => (
            <button
              key={index}
              className={`poll-option ${hasVoted ? 'voted' : ''} ${effectiveSelected === index ? 'selected' : ''}`}
              onClick={() => handleVote(index)}
              disabled={hasVoted || isPending}
            >
              <span className="option-text">{option}</span>
              {hasVoted && poll.results.options[index] && (
                <div className="option-result">
                  <div
                    className="option-bar"
                    style={{ width: `${poll.results.options[index].percentage}%` }}
                  />
                  <span className="option-percentage">
                    {poll.results.options[index].percentage.toFixed(1)}%
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {hasVoted && (
        <>
          <Results results={poll.results} options={poll.options} />
          <ShareButtons pollId={poll.id} question={poll.question} />
        </>
      )}
    </div>
  );
};

export default PollDetailPage;
