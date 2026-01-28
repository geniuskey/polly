import { useState } from 'react';
import { usePolls } from '../hooks/usePolls';
import PollCard from './PollCard';

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

const PollFeed = () => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = usePolls(selectedCategory || undefined);

  const polls = data?.pages.flatMap((page) => page.polls) ?? [];

  return (
    <div className="poll-feed">
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

      <div className="poll-list">
        {isLoading && <div className="loading">설문을 불러오는 중...</div>}
        {isError && (
          <div className="error">설문을 불러오는 데 실패했습니다.</div>
        )}
        {!isLoading && polls.length === 0 && (
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
