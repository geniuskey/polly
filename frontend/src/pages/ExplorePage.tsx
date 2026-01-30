import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient, type SearchPoll } from '../lib/api';
import { usePolls } from '../hooks/usePolls';
import PollCard from '../components/PollCard';

const ExplorePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialTag = searchParams.get('tag') || '';

  const [searchInput, setSearchInput] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);
  const [selectedTag, setSelectedTag] = useState(initialTag);

  // Fetch all tags
  const { data: tagsData } = useQuery({
    queryKey: ['allTags'],
    queryFn: () => apiClient.getAllTags(50),
  });

  // Search results
  const { data: searchData, isLoading: isSearching } = useQuery({
    queryKey: ['search', activeQuery],
    queryFn: () => apiClient.search(activeQuery),
    enabled: activeQuery.length >= 2,
  });

  // Tag filtered polls
  const {
    data: tagPollsData,
    isLoading: isLoadingTagPolls,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePolls(selectedTag || undefined);

  const tags = tagsData?.data?.tags || [];
  const searchResults = searchData?.data?.polls || [];
  const tagPolls = tagPollsData?.pages.flatMap((page) => page.polls) ?? [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveQuery(searchInput.trim());
    setSelectedTag('');
    if (searchInput.trim()) {
      setSearchParams({ q: searchInput.trim() });
    } else {
      setSearchParams({});
    }
  };

  const handleTagClick = (tagName: string) => {
    setSelectedTag(tagName);
    setActiveQuery('');
    setSearchInput('');
    setSearchParams({ tag: tagName });
  };

  const clearFilters = () => {
    setSelectedTag('');
    setActiveQuery('');
    setSearchInput('');
    setSearchParams({});
  };

  const isFiltered = activeQuery || selectedTag;

  return (
    <div className="explore-page">
      <h1>탐색</h1>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="설문 검색..."
          className="search-input"
        />
        <button type="submit" className="search-btn">검색</button>
      </form>

      {/* Tags Cloud */}
      <div className="tags-section">
        <h2>인기 태그</h2>
        <div className="tags-cloud">
          {tags.map((tag) => (
            <button
              key={tag.id}
              className={`tag-cloud-item ${selectedTag === tag.name ? 'active' : ''}`}
              onClick={() => handleTagClick(tag.name)}
            >
              #{tag.name}
              <span className="tag-count">{tag.pollCount}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Filter */}
      {isFiltered && (
        <div className="active-filter">
          <span>
            {activeQuery && `"${activeQuery}" 검색 결과`}
            {selectedTag && `#${selectedTag} 태그`}
          </span>
          <button className="clear-filter" onClick={clearFilters}>
            × 필터 해제
          </button>
        </div>
      )}

      {/* Search Results */}
      {activeQuery && (
        <div className="search-results">
          {isSearching && <div className="loading">검색 중...</div>}
          {!isSearching && searchResults.length === 0 && (
            <div className="empty">검색 결과가 없습니다.</div>
          )}
          {searchResults.map((poll) => (
            <SearchResultItem key={poll.id} poll={poll} />
          ))}
        </div>
      )}

      {/* Tag Filtered Polls */}
      {selectedTag && (
        <div className="tag-polls">
          {isLoadingTagPolls && <div className="loading">로딩 중...</div>}
          {!isLoadingTagPolls && tagPolls.length === 0 && (
            <div className="empty">해당 태그의 설문이 없습니다.</div>
          )}
          {tagPolls.map((poll) => (
            <PollCard key={poll.id} poll={poll} />
          ))}
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
      )}

      {/* Default: Recent Polls */}
      {!isFiltered && (
        <div className="recent-section">
          <h2>최근 설문</h2>
          <RecentPolls />
        </div>
      )}
    </div>
  );
};

const SearchResultItem = ({ poll }: { poll: SearchPoll }) => (
  <Link to={`/poll/${poll.id}`} className="search-result-item">
    <h3 className="result-question">{poll.question}</h3>
    <div className="result-meta">
      <span>{poll.responseCount}명 참여</span>
      <span className="result-options">{poll.options.join(' vs ')}</span>
    </div>
  </Link>
);

const RecentPolls = () => {
  const { data, isLoading } = usePolls(undefined, 'latest');
  const polls = data?.pages.flatMap((page) => page.polls).slice(0, 10) ?? [];

  if (isLoading) return <div className="loading">로딩 중...</div>;

  return (
    <div className="recent-polls-grid">
      {polls.map((poll) => (
        <Link key={poll.id} to={`/poll/${poll.id}`} className="recent-poll-item">
          <span className="recent-poll-question">{poll.question}</span>
          <span className="recent-poll-count">{poll.responseCount}명</span>
        </Link>
      ))}
    </div>
  );
};

export default ExplorePage;
