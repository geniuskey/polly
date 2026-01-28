import { useState } from 'react';
import { usePolls } from '../hooks/usePolls';
import PollCard from './PollCard';
import { FeedSkeleton } from './Skeleton';

const CATEGORIES = [
  { id: '', label: '전체' },
  { id: 'politics', label: '정치' },
  { id: 'society', label: '사회' },
  { id: 'life', label: '라이프' },
  { id: 'food', label: '음식' },
  { id: 'entertainment', label: '연예' },
  { id: 'sports', label: '스포츠' },
  { id: 'tech', label: '기술' },
  { id: 'economy', label: '경제' },
  { id: 'fun', label: '재미' },
];

const SORT_OPTIONS = [
  { id: 'latest', label: '최신순' },
  { id: 'popular', label: '인기순' },
];

const PollFeed = () => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = usePolls(selectedCategory || undefined, sortBy);

  const polls = data?.pages.flatMap((page) => page.polls) ?? [];

  return (
    <div className="poll-feed">
      <div className="feed-controls">
        <div className="category-tabs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`category-tab ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.label}
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
