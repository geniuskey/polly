import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  apiClient,
  type UserStatistics,
  type CategoryPreference,
  type EarnedAchievement,
  type AchievementProgress,
} from '../lib/api';

// Category Preferences Chart
const CategoryChart = ({ preferences }: { preferences: CategoryPreference[] }) => {
  if (preferences.length === 0) {
    return (
      <div className="category-chart empty">
        <p>아직 참여한 태그가 없습니다.</p>
      </div>
    );
  }

  const maxPct = Math.max(...preferences.map(p => p.percentage), 1);

  return (
    <div className="category-chart">
      <h4>관심 태그</h4>
      <div className="category-bars">
        {preferences.map(pref => (
          <div key={pref.tag} className="category-bar-row">
            <Link to={`/?tag=${pref.tag}`} className="category-label">
              #{pref.tag}
            </Link>
            <div className="category-bar-wrapper">
              <div
                className="category-bar-fill"
                style={{ width: `${(pref.percentage / maxPct) * 100}%` }}
              />
            </div>
            <span className="category-count">{pref.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Achievements Grid
const AchievementsGrid = ({
  earned,
  progress,
}: {
  earned: EarnedAchievement[];
  progress: AchievementProgress[];
}) => {
  return (
    <div className="achievements-section">
      <h4>업적</h4>

      {earned.length > 0 && (
        <div className="achievements-earned">
          <h5>획득한 업적 ({earned.length})</h5>
          <div className="achievements-grid">
            {earned.map(ach => (
              <div key={ach.id} className="achievement-card earned">
                <span className="achievement-emoji">{ach.emoji}</span>
                <span className="achievement-name">{ach.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {progress.length > 0 && (
        <div className="achievements-progress">
          <h5>진행 중</h5>
          <div className="achievements-list">
            {progress.map(ach => (
              <div key={ach.id} className="achievement-progress-item">
                <div className="achievement-info">
                  <span className="achievement-emoji">{ach.emoji}</span>
                  <span className="achievement-name">{ach.name}</span>
                </div>
                <div className="achievement-bar-wrapper">
                  <div className="achievement-bar">
                    <div
                      className="achievement-bar-fill"
                      style={{ width: `${ach.percentage}%` }}
                    />
                  </div>
                  <span className="achievement-progress-text">
                    {ach.current}/{ach.target}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {earned.length === 0 && progress.length === 0 && (
        <div className="achievements-empty">
          <p>더 많이 참여하면 업적을 획득할 수 있어요!</p>
        </div>
      )}
    </div>
  );
};

const StatisticsPanel = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['myStatistics'],
    queryFn: () => apiClient.getMyStatistics(),
  });

  if (isLoading) return <div className="loading">통계를 불러오는 중...</div>;
  if (isError) return <div className="error-state"><p>불러오기 실패</p></div>;

  const stats = data?.data as UserStatistics;

  if (stats.message && !stats.votingPatterns) {
    return (
      <div className="statistics-panel">
        <div className="statistics-empty">
          <div className="empty-icon">📊</div>
          <p>{stats.message}</p>
          <Link to="/" className="go-vote-btn">투표하러 가기</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="statistics-panel">
      {/* Newly earned achievements notification */}
      {stats.newlyEarned && stats.newlyEarned.length > 0 && (
        <div className="new-achievements-banner">
          <span className="banner-icon">🎉</span>
          <span>새로운 업적을 획득했습니다!</span>
        </div>
      )}

      {/* Category preferences */}
      <CategoryChart preferences={stats.categoryPreferences} />

      {/* Achievements */}
      <AchievementsGrid
        earned={stats.achievements.earned}
        progress={stats.achievements.progress}
      />
    </div>
  );
};

export default StatisticsPanel;
