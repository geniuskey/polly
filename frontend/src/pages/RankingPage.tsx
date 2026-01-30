import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient, type RankedPoll } from '../lib/api';

type RankingType = 'popular' | 'controversial' | 'rising';
type Period = 'day' | 'week' | 'month' | 'all';

const RANKING_TYPES = [
  { id: 'popular' as RankingType, label: '인기', emoji: '🔥' },
  { id: 'controversial' as RankingType, label: '논쟁', emoji: '⚔️' },
  { id: 'rising' as RankingType, label: '급상승', emoji: '📈' },
];

const PERIODS = [
  { id: 'day' as Period, label: '오늘' },
  { id: 'week' as Period, label: '이번 주' },
  { id: 'month' as Period, label: '이번 달' },
  { id: 'all' as Period, label: '전체' },
];

const RankingPage = () => {
  const [type, setType] = useState<RankingType>('popular');
  const [period, setPeriod] = useState<Period>('week');

  const { data, isLoading, error } = useQuery({
    queryKey: ['ranking', type, period],
    queryFn: () => apiClient.getRanking({ type, period, limit: 20 }),
  });

  const polls = data?.data?.polls || [];

  return (
    <div className="ranking-page">
      <h1>랭킹</h1>

      <div className="ranking-filters">
        <div className="ranking-types">
          {RANKING_TYPES.map((t) => (
            <button
              key={t.id}
              className={`ranking-type-btn ${type === t.id ? 'active' : ''}`}
              onClick={() => setType(t.id)}
            >
              <span className="type-emoji">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>

        <div className="ranking-periods">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              className={`period-btn ${period === p.id ? 'active' : ''}`}
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ranking-description">
        {type === 'popular' && '가장 많은 사람들이 참여한 설문'}
        {type === 'controversial' && '의견이 팽팽하게 나뉜 설문 (50:50에 가까울수록)'}
        {type === 'rising' && '최근 24시간 동안 빠르게 성장한 설문'}
      </div>

      {isLoading && <div className="loading">로딩 중...</div>}
      {error && <div className="error-state">불러오기 실패</div>}

      <div className="ranking-list">
        {polls.map((poll) => (
          <RankingItem key={poll.id} poll={poll} type={type} />
        ))}
      </div>

      {!isLoading && polls.length === 0 && (
        <div className="empty">해당 기간에 설문이 없습니다.</div>
      )}
    </div>
  );
};

const RankingItem = ({ poll, type }: { poll: RankedPoll; type: RankingType }) => {
  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  const medal = getMedalEmoji(poll.rank);

  return (
    <Link to={`/poll/${poll.id}`} className="ranking-item">
      <div className="ranking-rank">
        {medal || <span className="rank-number">{poll.rank}</span>}
      </div>
      <div className="ranking-content">
        <h3 className="ranking-question">{poll.question}</h3>
        <div className="ranking-meta">
          <span className="ranking-responses">{poll.responseCount}명 참여</span>
          {type === 'controversial' && poll.controversyScore > 0 && (
            <span className="ranking-controversy">
              ⚖️ {poll.controversyScore}% 균형
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default RankingPage;
