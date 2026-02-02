import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  apiClient,
  type InsightsData,
  type TimeSeriesData,
  type DemographicsData,
  type TagTrendData,
  type RealtimeTrendData,
} from '../lib/api';
import TrendChart from '../components/TrendChart';
import DemographicComparison from '../components/DemographicComparison';

type TrendPeriod = 'day' | 'week' | 'month';
type DemographicType = 'gender' | 'age' | 'region';

const InsightsPage = () => {
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('week');
  const [demoType, setDemoType] = useState<DemographicType>('gender');

  const { data: insightsData, isLoading: insightsLoading, error: insightsError } = useQuery({
    queryKey: ['insights'],
    queryFn: () => apiClient.getInsights(),
  });

  const { data: timeSeriesData, isLoading: timeSeriesLoading } = useQuery({
    queryKey: ['trendTimeSeries', trendPeriod],
    queryFn: () => apiClient.getTrendTimeSeries({ period: trendPeriod }),
  });

  const { data: demographicsData, isLoading: demographicsLoading } = useQuery({
    queryKey: ['trendDemographics', demoType, trendPeriod],
    queryFn: () => apiClient.getTrendDemographics({ type: demoType, period: trendPeriod }),
  });

  const { data: tagTrendData, isLoading: tagTrendLoading } = useQuery({
    queryKey: ['trendTags', trendPeriod],
    queryFn: () => apiClient.getTrendTags({ period: trendPeriod, limit: 8 }),
  });

  const { data: realtimeData, isLoading: realtimeLoading } = useQuery({
    queryKey: ['trendRealtime'],
    queryFn: () => apiClient.getTrendRealtime(5),
    refetchInterval: 60000, // Refresh every minute
  });

  if (insightsLoading) return <div className="insights-page"><div className="loading">분석 중...</div></div>;
  if (insightsError) return <div className="insights-page"><div className="error-state">불러오기 실패</div></div>;

  const insights = insightsData?.data as InsightsData;

  return (
    <div className="insights-page">
      <h1>인사이트</h1>

      {/* Realtime Trending */}
      {!realtimeLoading && realtimeData?.data && (realtimeData.data as RealtimeTrendData).trending.length > 0 && (
        <section className="insights-section realtime-section">
          <h2>
            <span className="live-indicator" /> 실시간 인기
          </h2>
          <div className="realtime-list">
            {(realtimeData.data as RealtimeTrendData).trending.map((item) => (
              <Link key={item.id} to={`/poll/${item.id}`} className="realtime-item">
                <span className="realtime-rank">{item.rank}</span>
                <span className="realtime-question">{item.question}</span>
                <span className="realtime-votes">+{item.recentVotes}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

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

      {/* Time Series Chart with Period Selector */}
      <section className="insights-section">
        <div className="section-header-with-selector">
          <h2>투표 트렌드</h2>
          <div className="trend-period-selector">
            <button
              className={`period-btn ${trendPeriod === 'day' ? 'active' : ''}`}
              onClick={() => setTrendPeriod('day')}
            >
              오늘
            </button>
            <button
              className={`period-btn ${trendPeriod === 'week' ? 'active' : ''}`}
              onClick={() => setTrendPeriod('week')}
            >
              이번 주
            </button>
            <button
              className={`period-btn ${trendPeriod === 'month' ? 'active' : ''}`}
              onClick={() => setTrendPeriod('month')}
            >
              이번 달
            </button>
          </div>
        </div>
        {timeSeriesLoading ? (
          <div className="chart-loading">로딩 중...</div>
        ) : timeSeriesData?.data ? (
          <TrendChart data={timeSeriesData.data as TimeSeriesData} />
        ) : null}
      </section>

      {/* Demographics */}
      <section className="insights-section">
        <h2>참여자 분포</h2>
        <div className="demo-type-selector">
          <button
            className={`demo-type-btn ${demoType === 'gender' ? 'active' : ''}`}
            onClick={() => setDemoType('gender')}
          >
            성별
          </button>
          <button
            className={`demo-type-btn ${demoType === 'age' ? 'active' : ''}`}
            onClick={() => setDemoType('age')}
          >
            연령대
          </button>
          <button
            className={`demo-type-btn ${demoType === 'region' ? 'active' : ''}`}
            onClick={() => setDemoType('region')}
          >
            지역
          </button>
        </div>
        {demographicsLoading ? (
          <div className="chart-loading">로딩 중...</div>
        ) : demographicsData?.data ? (
          <DemographicComparison data={demographicsData.data as DemographicsData} />
        ) : null}
      </section>

      {/* Tag Trends */}
      <section className="insights-section">
        <h2>태그 트렌드</h2>
        {tagTrendLoading ? (
          <div className="chart-loading">로딩 중...</div>
        ) : tagTrendData?.data && (tagTrendData.data as TagTrendData).tags.length > 0 ? (
          <div className="tag-trends">
            {(tagTrendData.data as TagTrendData).tags.map((item) => (
              <Link key={item.tag} to={`/?tag=${item.tag}`} className="tag-trend-item">
                <span className="tag-name">#{item.tag}</span>
                <div className="tag-stats">
                  <span className="tag-count">{item.count}표</span>
                  <span className={`tag-change ${item.trend}`}>
                    {item.trend === 'up' && '↑'}
                    {item.trend === 'down' && '↓'}
                    {item.trend === 'stable' && '→'}
                    {Math.abs(item.change)}%
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="no-data">아직 태그 데이터가 없습니다.</p>
        )}
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
