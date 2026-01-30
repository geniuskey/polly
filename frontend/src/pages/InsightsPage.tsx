import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient, type InsightsData } from '../lib/api';

const InsightsPage = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['insights'],
    queryFn: () => apiClient.getInsights(),
  });

  if (isLoading) return <div className="insights-page"><div className="loading">분석 중...</div></div>;
  if (error) return <div className="insights-page"><div className="error-state">불러오기 실패</div></div>;

  const insights = data?.data as InsightsData;

  return (
    <div className="insights-page">
      <h1>인사이트</h1>
      <p className="insights-subtitle">VibePulse 투표 트렌드를 한눈에</p>

      {/* Total Stats */}
      <section className="insights-section">
        <h2>전체 통계</h2>
        <div className="insights-totals">
          <div className="insight-stat-card">
            <span className="stat-emoji">📊</span>
            <span className="stat-value">{insights.totals.polls.toLocaleString()}</span>
            <span className="stat-label">총 설문</span>
          </div>
          <div className="insight-stat-card">
            <span className="stat-emoji">✋</span>
            <span className="stat-value">{insights.totals.responses.toLocaleString()}</span>
            <span className="stat-label">총 투표</span>
          </div>
          <div className="insight-stat-card">
            <span className="stat-emoji">👥</span>
            <span className="stat-value">{insights.totals.participants.toLocaleString()}</span>
            <span className="stat-label">참여자</span>
          </div>
        </div>
      </section>

      {/* Hourly Activity Chart */}
      <section className="insights-section">
        <h2>시간대별 활동 (최근 7일)</h2>
        <div className="hourly-chart">
          {insights.hourlyActivity.map((item) => {
            const maxCount = Math.max(...insights.hourlyActivity.map(h => h.count));
            const heightPercent = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
            return (
              <div key={item.hour} className="hour-bar-container">
                <div
                  className="hour-bar"
                  style={{ height: `${Math.max(heightPercent, 5)}%` }}
                  title={`${item.hour}시: ${item.count}표`}
                />
                <span className="hour-label">{item.hour}</span>
              </div>
            );
          })}
        </div>
        <p className="chart-hint">활발한 시간대를 확인해보세요</p>
      </section>

      {/* Gender Divisive Polls */}
      {insights.genderDivisive.length > 0 && (
        <section className="insights-section">
          <h2>성별 의견 차이가 큰 설문</h2>
          <p className="section-description">남녀 간 선택이 가장 다른 설문들</p>
          <div className="divisive-list">
            {insights.genderDivisive.map((poll) => (
              <Link key={poll.id} to={`/poll/${poll.id}`} className="divisive-item">
                <div className="divisive-content">
                  <span className="divisive-question">{poll.question}</span>
                  <span className="divisive-meta">{poll.responseCount}명 참여</span>
                </div>
                <div className="divisive-gap">
                  <span className="gap-value">{poll.genderGap}%</span>
                  <span className="gap-label">차이</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Category Trends */}
      {insights.categoryTrends.length > 0 && (
        <section className="insights-section">
          <h2>이번 주 인기 카테고리</h2>
          <div className="category-trends">
            {insights.categoryTrends.map((cat, index) => (
              <div key={cat.category} className="category-trend-item">
                <span className="trend-rank">{index + 1}</span>
                <span className="trend-category">{cat.category}</span>
                <span className="trend-count">{cat.responses}표</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Fun Facts */}
      <section className="insights-section">
        <h2>재미있는 사실</h2>
        <div className="fun-facts">
          <div className="fun-fact">
            <span className="fact-emoji">🌙</span>
            <span className="fact-text">
              가장 활발한 시간대는{' '}
              <strong>
                {insights.hourlyActivity.length > 0
                  ? `${insights.hourlyActivity.reduce((a, b) => a.count > b.count ? a : b).hour}시`
                  : '아직 데이터 수집 중'}
              </strong>
            </span>
          </div>
          <div className="fun-fact">
            <span className="fact-emoji">📈</span>
            <span className="fact-text">
              평균{' '}
              <strong>
                {insights.totals.polls > 0
                  ? Math.round(insights.totals.responses / insights.totals.polls)
                  : 0}
                명
              </strong>
              이 설문당 참여
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default InsightsPage;
