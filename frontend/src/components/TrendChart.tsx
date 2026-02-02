import { useState } from 'react';
import type { TimeSeriesData } from '../lib/api';

interface TrendChartProps {
  data: TimeSeriesData;
}

const TrendChart = ({ data }: TrendChartProps) => {
  const { series } = data;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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
  const padding = { top: 8, right: 5, bottom: 5, left: 5 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate point positions
  const getX = (i: number) => padding.left + (i / (series.length - 1 || 1)) * chartWidth;
  const getVoteY = (votes: number) => padding.top + chartHeight - (votes / maxVotes) * chartHeight;
  const getPollY = (polls: number) => padding.top + chartHeight - (polls / maxPolls) * chartHeight;

  // Create path for votes line
  const votesPath = series.map((d, i) => {
    const x = getX(i);
    const y = getVoteY(d.votes);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Create path for polls line
  const pollsPath = series.map((d, i) => {
    const x = getX(i);
    const y = getPollY(d.polls);
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
          {/* Interactive hover points */}
          {series.map((d, i) => (
            <g key={i}>
              {/* Invisible larger hit area */}
              <rect
                x={getX(i) - (chartWidth / series.length / 2)}
                y={padding.top}
                width={chartWidth / series.length}
                height={chartHeight}
                fill="transparent"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ cursor: 'pointer' }}
              />
              {/* Visible dots on hover */}
              {hoveredIndex === i && (
                <>
                  <circle cx={getX(i)} cy={getVoteY(d.votes)} r="2" fill="#6366f1" />
                  <circle cx={getX(i)} cy={getPollY(d.polls)} r="2" fill="#22c55e" />
                </>
              )}
            </g>
          ))}
        </svg>

        {/* Tooltip */}
        {hoveredIndex !== null && (
          <div
            className="chart-tooltip"
            style={{
              left: `${(hoveredIndex / (series.length - 1 || 1)) * 100}%`,
            }}
          >
            <div className="tooltip-date">{formatDate(series[hoveredIndex].date)}</div>
            <div className="tooltip-row votes">투표: {series[hoveredIndex].votes}</div>
            <div className="tooltip-row polls">설문: {series[hoveredIndex].polls}</div>
          </div>
        )}

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
    </div>
  );
};

export default TrendChart;
