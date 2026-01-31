import { Link } from 'react-router-dom';
import { useTrending } from '../hooks/usePolls';

type TrendingType = 'rising' | 'popular' | 'controversial';

interface TrendingSectionProps {
  className?: string;
}

const TYPE_CONFIG: Record<TrendingType, { icon: string; label: string; badge: string }> = {
  rising: { icon: '📈', label: '급상승', badge: '급상승' },
  popular: { icon: '🔥', label: '인기', badge: '인기' },
  controversial: { icon: '⚖️', label: '논쟁', badge: '논쟁중' },
};

const formatCount = (count: number): string => {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}만`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}천`;
  }
  return String(count);
};

const TrendingSection = ({ className = '' }: TrendingSectionProps) => {
  const { data: risingData, isLoading } = useTrending('rising', 'day', 5);

  if (isLoading) {
    return (
      <div className={`trending-section ${className}`}>
        <div className="trending-header">
          <span className="trending-title">🔥 지금 뜨는 주제</span>
        </div>
        <div className="trending-cards">
          {[1, 2, 3].map((i) => (
            <div key={i} className="trending-card skeleton">
              <div className="skeleton-text" />
              <div className="skeleton-count" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const polls = risingData?.data?.polls || [];

  if (polls.length === 0) {
    return null;
  }

  return (
    <div className={`trending-section ${className}`}>
      <div className="trending-header">
        <span className="trending-title">🔥 지금 뜨는 주제</span>
        <Link to="/ranking" className="trending-more">
          더보기 →
        </Link>
      </div>
      <div className="trending-cards">
        {polls.map((poll, index) => {
          const type: TrendingType = index === 0 ? 'popular' : 'rising';
          const config = TYPE_CONFIG[type];

          return (
            <Link
              key={poll.id}
              to={`/poll/${poll.id}`}
              className="trending-card"
            >
              <div className="trending-card-badge">
                <span className="badge-icon">{config.icon}</span>
                <span className="badge-text">{config.badge}</span>
              </div>
              <p className="trending-question">{poll.question}</p>
              <div className="trending-meta">
                <span className="trending-count">
                  🔴 {formatCount(poll.responseCount)}명 참여
                </span>
                {poll.controversyScore > 60 && (
                  <span className="trending-controversy">
                    ⚡ 팽팽
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default TrendingSection;
