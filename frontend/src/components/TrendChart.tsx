import type { TimeSeriesData } from '../lib/api';

interface TrendChartProps {
  data: TimeSeriesData;
}

const TrendChart = ({ data }: TrendChartProps) => {
  const { series } = data;

  if (series.length === 0) {
    return (
      <div className="trend-chart empty">
        <p>아직 데이터가 없습니다.</p>
      </div>
    );
  }

  // Calculate max values for scaling
  const maxVotes = Math.max(...series.map(d => d.votes), 1);
  const maxPolls = Math.max(...series.map(d => d.polls), 1);

  // SVG dimensions
  const width = 100;
  const height = 50;
  const padding = { top: 5, right: 5, bottom: 5, left: 5 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Create path for votes line
  const votesPath = series.map((d, i) => {
    const x = padding.left + (i / (series.length - 1 || 1)) * chartWidth;
    const y = padding.top + chartHeight - (d.votes / maxVotes) * chartHeight;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Create path for polls line
  const pollsPath = series.map((d, i) => {
    const x = padding.left + (i / (series.length - 1 || 1)) * chartWidth;
    const y = padding.top + chartHeight - (d.polls / maxPolls) * chartHeight;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Create area fill path for votes
  const votesAreaPath = `${votesPath} L ${padding.left + chartWidth} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (dateStr.includes('W')) {
      return dateStr.split('-W')[1] + '주';
    }
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}`;
    }
    return dateStr;
  };

  return (
    <div className="trend-chart">
      <div className="chart-legend">
        <span className="legend-item votes">
          <span className="legend-dot" /> 투표 수
        </span>
        <span className="legend-item polls">
          <span className="legend-dot" /> 설문 수
        </span>
      </div>

      <div className="chart-container">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="line-chart-svg">
          {/* Votes area fill */}
          <path
            d={votesAreaPath}
            fill="rgba(99, 102, 241, 0.1)"
          />
          {/* Votes line */}
          <path
            d={votesPath}
            fill="none"
            stroke="#6366f1"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* Polls line */}
          <path
            d={pollsPath}
            fill="none"
            stroke="#22c55e"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray="3 2"
          />
        </svg>

        <div className="chart-x-axis">
          {series.length > 0 && (
            <>
              <span>{formatDate(series[0].date)}</span>
              {series.length > 2 && (
                <span>{formatDate(series[Math.floor(series.length / 2)].date)}</span>
              )}
              <span>{formatDate(series[series.length - 1].date)}</span>
            </>
          )}
        </div>
      </div>

      <div className="chart-summary">
        <div className="summary-item">
          <span className="summary-value">{series.reduce((sum, d) => sum + d.votes, 0).toLocaleString()}</span>
          <span className="summary-label">총 투표</span>
        </div>
        <div className="summary-item">
          <span className="summary-value">{series.reduce((sum, d) => sum + d.polls, 0).toLocaleString()}</span>
          <span className="summary-label">총 설문</span>
        </div>
      </div>
    </div>
  );
};

export default TrendChart;
