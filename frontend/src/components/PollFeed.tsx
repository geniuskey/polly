import { useState } from 'react';
import { usePolls, usePopularTags } from '../hooks/usePolls';
import PollCard from './PollCard';
import { FeedSkeleton } from './Skeleton';
import { hasVoted } from '../lib/voteStorage';

const SORT_OPTIONS = [
  { id: 'latest', label: '최신순' },
  { id: 'trending', label: '급상승' },
  { id: 'popular', label: '인기순' },
];

const PollFeed = () => {
  const [selectedTag, setSelectedTag] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [hideVoted, setHideVoted] = useState(() => {
    return localStorage.getItem('hideVotedPolls') === 'true';
  });

  const { data: tagsData } = usePopularTags(10);
  const popularTags = tagsData?.data?.tags || [];

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = usePolls(selectedTag || undefined, sortBy);

  const allPolls = data?.pages.flatMap((page) => page.polls) ?? [];
  const polls = hideVoted ? allPolls.filter((poll) => !hasVoted(poll.id)) : allPolls;

  const toggleHideVoted = () => {
    const newValue = !hideVoted;
    setHideVoted(newValue);
    localStorage.setItem('hideVotedPolls', String(newValue));
  };

  const votedCount = allPolls.length - polls.length;

  return (
    <div className="poll-feed">
      <div className="feed-controls">
        <div className="category-tabs">
          <button
            className={`category-tab ${selectedTag === '' ? 'active' : ''}`}
            onClick={() => setSelectedTag('')}
          >
            전체
          </button>
          {popularTags.map((tag) => (
            <button
              key={tag.id}
              className={`category-tab ${selectedTag === tag.name ? 'active' : ''}`}
              onClick={() => setSelectedTag(tag.name)}
            >
              #{tag.name}
            </button>
          ))}
        </div>
        <div className="feed-actions">
          <button
            className={`hide-voted-btn ${hideVoted ? 'active' : ''}`}
            onClick={toggleHideVoted}
            title={hideVoted ? '참여한 설문 표시' : '참여한 설문 숨기기'}
          >
            {hideVoted ? '참여완료 숨김' : '참여완료 표시'}
            {votedCount > 0 && <span className="voted-count">{votedCount}</span>}
          </button>
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

      <div className="poll-list">
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
    </div>
  );
};

export default PollFeed;
