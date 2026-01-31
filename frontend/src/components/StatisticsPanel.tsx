import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  apiClient,
  type UserStatistics,
  type VotingPatterns,
  type CategoryPreference,
  type EarnedAchievement,
  type AchievementProgress,
} from '../lib/api';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LABELS_KO: Record<string, string> = {
  Sun: '일', Mon: '월', Tue: '화', Wed: '수', Thu: '목', Fri: '금', Sat: '토',
};

// Voting Heatmap Component
const VotingHeatmap = ({ patterns }: { patterns: VotingPatterns }) => {
  const maxCount = Math.max(
    1,
    ...Object.values(patterns.heatmap).flatMap(h => Object.values(h))
  );

  const getIntensity = (count: number): number => {
    if (count === 0) return 0;
    return Math.ceil((count / maxCount) * 4);
  };

  // Get hours to display (0-23 in 3-hour blocks)
  const hours = [0, 3, 6, 9, 12, 15, 18, 21];

  return (
    <div className="voting-heatmap">
      <h4>투표 시간 패턴</h4>
      <div className="heatmap-grid">
        <div className="heatmap-header">
          <div className="heatmap-corner"></div>
          {hours.map(h => (
            <div key={h} className="heatmap-hour-label">{h}시</div>
          ))}
        </div>
        {DAY_LABELS.map(day => (
          <div key={day} className="heatmap-row">
            <div className="heatmap-day-label">{DAY_LABELS_KO[day]}</div>
            {hours.map(hour => {
              // Sum the 3-hour block
              let count = 0;
              for (let h = hour; h < hour + 3 && h < 24; h++) {
                const hourStr = h.toString().padStart(2, '0');
                count += patterns.heatmap[day]?.[hourStr] || 0;
              }
              const intensity = getIntensity(count);
              return (
                <div
                  key={`${day}-${hour}`}
                  className={`heatmap-cell intensity-${intensity}`}
                  title={`${DAY_LABELS_KO[day]} ${hour}~${hour + 3}시: ${count}개`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="heatmap-legend">
        <span>적음</span>
        <div className="legend-cells">
          <div className="heatmap-cell intensity-0" />
          <div className="heatmap-cell intensity-1" />
          <div className="heatmap-cell intensity-2" />
          <div className="heatmap-cell intensity-3" />
          <div className="heatmap-cell intensity-4" />
        </div>
        <span>많음</span>
      </div>
    </div>
  );
};

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

      {/* Voting patterns heatmap */}
      {stats.votingPatterns && (
        <VotingHeatmap patterns={stats.votingPatterns} />
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
