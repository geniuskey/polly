import { useState, useRef } from 'react';
import { usePolls } from '../hooks/usePolls';
import PollCard from './PollCard';
import SwipeableCardStack from './SwipeableCardStack';
import TrendingSection from './TrendingSection';
import LandingHero from './LandingHero';
import { FeedSkeleton } from './Skeleton';
import { hasVoted } from '../lib/voteStorage';

const SORT_OPTIONS = [
  { id: 'latest', label: '최신순' },
  { id: 'popular', label: '인기순' },
];

type ViewMode = 'list' | 'swipe';

const PollFeed = () => {
  const [sortBy, setSortBy] = useState('latest');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('pollViewMode') as ViewMode) || 'swipe';
  });
  const [hideVoted, setHideVoted] = useState(() => {
    return localStorage.getItem('hideVotedPolls') === 'true';
  });
  const pollsSectionRef = useRef<HTMLDivElement>(null);

  const scrollToPolls = () => {
    pollsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = usePolls(undefined, sortBy);

  const allPolls = data?.pages.flatMap((page) => page.polls) ?? [];
  const polls = hideVoted ? allPolls.filter((poll) => !hasVoted(poll.id)) : allPolls;

  const toggleHideVoted = () => {
    const newValue = !hideVoted;
    setHideVoted(newValue);
    localStorage.setItem('hideVotedPolls', String(newValue));
  };

  const toggleViewMode = () => {
    const newMode = viewMode === 'list' ? 'swipe' : 'list';
    setViewMode(newMode);
    localStorage.setItem('pollViewMode', newMode);
  };

  const votedCount = allPolls.length - polls.length;

  return (
    <div className="poll-feed">
      <LandingHero onScrollToPolls={scrollToPolls} />

      <div ref={pollsSectionRef}>
        <TrendingSection />

      <div className="feed-controls">
        <div className="feed-actions">
          <div className="feed-left-actions">
            <button
              className={`view-mode-btn ${viewMode === 'swipe' ? 'active' : ''}`}
              onClick={toggleViewMode}
              title={viewMode === 'swipe' ? '리스트로 보기' : '스와이프로 보기'}
            >
              {viewMode === 'swipe' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M8 12h8M12 8l4 4-4 4" />
                </svg>
              )}
            </button>
            <button
              className={`hide-voted-btn ${hideVoted ? 'active' : ''}`}
              onClick={toggleHideVoted}
              title={hideVoted ? '참여한 설문 표시' : '참여한 설문 숨기기'}
            >
              {hideVoted ? '참여완료 숨김' : '참여완료 표시'}
              {votedCount > 0 && <span className="voted-count">{votedCount}</span>}
            </button>
          </div>
          <div className="sort-options">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                className={`sort-btn ${sortBy === opt.id ? 'active' : ''}`}
                onClick={() => setSortBy(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading && <FeedSkeleton />}
      {isError && (
        <div className="error-state">
          <p>설문을 불러오는 데 실패했습니다.</p>
          <button className="retry-btn" onClick={() => refetch()}>
            다시 시도
          </button>
        </div>
      )}
      {!isLoading && !isError && polls.length === 0 && (
        <div className="empty">
          {hideVoted && allPolls.length > 0
            ? '모든 설문에 참여했습니다! 🎉'
            : '아직 등록된 설문이 없습니다.'}
        </div>
      )}

      {!isLoading && !isError && polls.length > 0 && viewMode === 'swipe' && (
        <SwipeableCardStack>
          {polls.map((poll) => (
            <PollCard key={poll.id} poll={poll} />
          ))}
        </SwipeableCardStack>
      )}

      {!isLoading && !isError && polls.length > 0 && viewMode === 'list' && (
        <>
          <div className="poll-list">
            {polls.map((poll) => (
              <PollCard key={poll.id} poll={poll} />
            ))}
          </div>

          {hasNextPage && (
            <button
              className="load-more"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? '불러오는 중...' : '더 보기'}
            </button>
          )}
        </>
      )}

      {viewMode === 'swipe' && hasNextPage && !isFetchingNextPage && (
        <button
          className="load-more"
          onClick={() => fetchNextPage()}
        >
          더 많은 설문 불러오기
        </button>
      )}
      </div>
    </div>
  );
};

export default PollFeed;
