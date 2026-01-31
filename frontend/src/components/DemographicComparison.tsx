import type { DemographicsData } from '../lib/api';

interface DemographicComparisonProps {
  data: DemographicsData;
}

const GENDER_LABELS: Record<string, string> = {
  male: '남성',
  female: '여성',
  other: '기타',
};

const AGE_LABELS: Record<string, string> = {
  '10s': '10대',
  '20s': '20대',
  '30s': '30대',
  '40s': '40대',
  '50s': '50대',
  '60+': '60대+',
};

const COLORS: Record<string, string> = {
  male: '#3b82f6',
  female: '#ec4899',
  other: '#8b5cf6',
  '10s': '#ef4444',
  '20s': '#f97316',
  '30s': '#eab308',
  '40s': '#22c55e',
  '50s': '#06b6d4',
  '60+': '#8b5cf6',
};

const DemographicComparison = ({ data }: DemographicComparisonProps) => {
  const { data: groups, type, total } = data;

  if (groups.length === 0) {
    return (
      <div className="demographic-chart empty">
        <p>아직 데이터가 없습니다. 더 많은 참여가 필요해요.</p>
      </div>
    );
  }

  const getLabel = (group: string) => {
    if (type === 'gender') return GENDER_LABELS[group] || group;
    if (type === 'age') return AGE_LABELS[group] || group;
    return group;
  };

  const getColor = (group: string) => {
    return COLORS[group] || '#6366f1';
  };

  const maxPct = Math.max(...groups.map(g => g.percentage), 1);

  return (
    <div className="demographic-chart">
      <div className="demographic-bars">
        {groups.map((item) => (
          <div key={item.group} className="demographic-bar-row">
            <div className="demographic-label">
              <span
                className="demographic-dot"
                style={{ backgroundColor: getColor(item.group) }}
              />
              {getLabel(item.group)}
            </div>
            <div className="demographic-bar-wrapper">
              <div
                className="demographic-bar-fill"
                style={{
                  width: `${(item.percentage / maxPct) * 100}%`,
                  backgroundColor: getColor(item.group),
                }}
              />
            </div>
            <div className="demographic-value">
              <span className="pct">{item.percentage}%</span>
              <span className="count">({item.count.toLocaleString()})</span>
            </div>
          </div>
        ))}
      </div>

      <div className="demographic-footer">
        <span>총 {total.toLocaleString()}명 참여</span>
      </div>
    </div>
  );
};

export default DemographicComparison;
