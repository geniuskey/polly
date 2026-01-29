import { useState } from 'react';
import { usePolls, usePopularTags } from '../hooks/usePolls';
import PollCard from './PollCard';
import { FeedSkeleton } from './Skeleton';

const SORT_OPTIONS = [
  { id: 'latest', label: '최신순' },
  { id: 'trending', label: '급상승' },
  { id: 'popular', label: '인기순' },
];

const PollFeed = () => {
  const [selectedTag, setSelectedTag] = useState('');
  const [sortBy, setSortBy] = useState('latest');

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

  const polls = data?.pages.flatMap((page) => page.polls) ?? [];

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
          <div className="empty">아직 등록된 설문이 없습니다.</div>
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
