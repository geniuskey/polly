import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { usePoll, useVote } from '../hooks/usePolls';
import { generateFingerprint } from '../lib/fingerprint';
import { saveVote, getVote } from '../lib/voteStorage';
import Results from '../components/Results';
import ShareButtons from '../components/ShareButtons';
import Comments from '../components/Comments';
import ExpirationTimer from '../components/ExpirationTimer';
import { DetailSkeleton } from '../components/Skeleton';
import type { PollOption } from '../types';

// Helper to normalize option (handle both string and object formats)
const getOptionText = (option: string | PollOption): string => {
  if (typeof option === 'string') return option;
  return option.text || '';
};

const getOptionImage = (option: string | PollOption): string | null => {
  if (typeof option === 'string') return null;
  return option.imageUrl || null;
};


const PollDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = usePoll(id!);
  const { mutateAsync: vote, isPending } = useVote(id!);

  // Check localStorage for stored vote
  const storedVote = id ? getVote(id) : null;

  const [voted, setVoted] = useState(storedVote !== null);
  const [selectedOption, setSelectedOption] = useState<number | null>(storedVote);
  const [justVoted, setJustVoted] = useState(false);

  // Update state when storedVote changes (e.g., on navigation)
  useEffect(() => {
    if (storedVote !== null) {
      setVoted(true);
      setSelectedOption(storedVote);
    }
  }, [storedVote]);

  let currentUserId: string | undefined;
  try {
    const { userId } = useAuth();
    currentUserId = userId ?? undefined;
  } catch {
    // Clerk not initialized - no auth
  }

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
  const hasVoted = voted || storedVote !== null;
  const isExpired = poll.expiresAt ? new Date(poll.expiresAt) < new Date() : false;

  const handleVote = async (optionIndex: number) => {
    if (hasVoted || isPending) return;
    try {
      const fingerprint = await generateFingerprint();
      await vote({ optionIndex, fingerprint });

      // Save to localStorage
      saveVote(poll.id, optionIndex);

      setVoted(true);
      setSelectedOption(optionIndex);
      setJustVoted(true);
      refetch();

      setTimeout(() => setJustVoted(false), 500);
    } catch (err) {
      const error = err as Error & { code?: string };
      if (error.code === 'DUPLICATE_VOTE') {
        // Save to localStorage even if already voted
        saveVote(poll.id, optionIndex);
        setVoted(true);
        setSelectedOption(optionIndex);
        refetch();
      } else if (error.code === 'POLL_EXPIRED') {
        alert('마감된 설문입니다.');
      } else {
        alert('투표 중 오류가 발생했습니다.');
      }
    }
  };

  const effectiveSelected = selectedOption ?? storedVote ?? null;

  return (
    <div className="poll-detail">
      <Link to="/" className="back-link">&larr; 목록으로</Link>

      <div className="poll-card">
        <div className="poll-card-header">
          <div className="poll-tags">
            {poll.tags?.map((tag) => (
              <span key={tag} className="poll-tag">#{tag}</span>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {poll.expiresAt && <ExpirationTimer expiresAt={poll.expiresAt} />}
            <span className="poll-responses">{poll.results.total}명 참여</span>
          </div>
        </div>

        <h2 className="poll-question">{poll.question}</h2>

        <div className={`poll-options ${poll.options.some(o => getOptionImage(o)) ? 'with-images' : ''}`}>
          {poll.options.map((option, index) => {
            const optionText = getOptionText(option);
            const optionImage = getOptionImage(option);
            const hasImage = !!optionImage;
            return (
              <button
                key={index}
                className={`poll-option ${hasVoted ? 'voted' : ''} ${effectiveSelected === index ? 'selected' : ''} ${justVoted && effectiveSelected === index ? 'just-voted' : ''} ${hasImage ? 'has-image' : ''}`}
                onClick={() => handleVote(index)}
                disabled={hasVoted || isPending || isExpired}
              >
                {/* Option image */}
                {hasImage && (
                  <div className="option-image">
                    <img src={optionImage} alt={optionText} loading="lazy" />
                  </div>
                )}

                <span className="option-text">
                  {effectiveSelected === index && hasVoted && (
                    <span className="my-vote-badge">내 선택</span>
                  )}
                  {optionText}
                </span>
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
            );
          })}
        </div>
      </div>

      {hasVoted && (
        <>
          <Results results={poll.results} options={poll.options} />
          <ShareButtons pollId={poll.id} question={poll.question} />
        </>
      )}

      <Comments pollId={poll.id} currentUserId={currentUserId} />
    </div>
  );
};

export default PollDetailPage;
