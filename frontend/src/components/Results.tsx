import { useState } from 'react';
import type { VoteResult, PollOption } from '../types';

interface ResultsProps {
  results: VoteResult;
  options: PollOption[];
}

const GENDER_LABELS: Record<string, string> = {
  male: '남성',
  female: '여성',
  other: '기타',
};

const GENDER_COLORS: Record<string, string> = {
  male: '#3b82f6',
  female: '#ec4899',
  other: '#8b5cf6',
};

const AGE_LABELS: Record<string, string> = {
  '10s': '10대',
  '20s': '20대',
  '30s': '30대',
  '40s': '40대',
  '50s': '50대',
  '60+': '60+',
};

const AGE_COLORS: Record<string, string> = {
  '10s': '#ef4444',
  '20s': '#f97316',
  '30s': '#eab308',
  '40s': '#22c55e',
  '50s': '#06b6d4',
  '60+': '#8b5cf6',
};

type TabType = 'total' | 'gender' | 'age';

const Results = ({ results, options }: ResultsProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('total');

  const hasGenderData = results.byGender && Object.keys(results.byGender).length > 0;
  const hasAgeData = results.byAgeGroup && Object.keys(results.byAgeGroup).length > 0;

  // Get all available genders/ages for comparison chart
  const genders = results.byGender ? Object.keys(results.byGender) : [];
  const ageGroups = results.byAgeGroup ? Object.keys(results.byAgeGroup) : [];

  return (
    <div className="results">
      <div className="results-header">
        <span className="results-total">{results.total}명 참여</span>
      </div>

      <div className="results-tabs">
        <button
          className={`results-tab ${activeTab === 'total' ? 'active' : ''}`}
          onClick={() => setActiveTab('total')}
        >
          전체
        </button>
        <button
          className={`results-tab ${activeTab === 'gender' ? 'active' : ''}`}
          onClick={() => setActiveTab('gender')}
          disabled={!hasGenderData}
        >
          성별
        </button>
        <button
          className={`results-tab ${activeTab === 'age' ? 'active' : ''}`}
          onClick={() => setActiveTab('age')}
          disabled={!hasAgeData}
        >
          연령대
        </button>
      </div>

      {activeTab === 'total' && (
        <div className="results-bars">
          {results.options.map((opt, i) => (
            <div key={i} className="result-row">
              <div className="result-label">{options[i]?.text || `옵션 ${i + 1}`}</div>
              <div className="result-bar-wrapper">
                <div
                  className="result-bar-fill"
                  style={{ width: `${opt.percentage}%` }}
                />
              </div>
              <div className="result-value">
                {opt.percentage.toFixed(1)}%
                <span className="result-count">({opt.count})</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'gender' && hasGenderData && results.byGender && (
        <div className="results-comparison">
          {/* Legend */}
          <div className="comparison-legend">
            {genders.map((gender) => (
              <div key={gender} className="legend-item">
                <span
                  className="legend-color"
                  style={{ backgroundColor: GENDER_COLORS[gender] || '#6366f1' }}
                />
                <span className="legend-label">
                  {GENDER_LABELS[gender] || gender}
                  <span className="legend-count">({results.byGender![gender].count})</span>
                </span>
              </div>
            ))}
          </div>

          {/* Comparison Chart */}
          <div className="comparison-chart">
            {options.map((option, optIndex) => (
              <div key={optIndex} className="comparison-row">
                <div className="comparison-label">{option.text}</div>
                <div className="comparison-bars">
                  {genders.map((gender) => {
                    const pct = results.byGender![gender].options[optIndex];
                    return (
                      <div key={gender} className="comparison-bar-container">
                        <div
                          className="comparison-bar"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: GENDER_COLORS[gender] || '#6366f1',
                          }}
                        />
                        <span className="comparison-value">{pct.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'age' && hasAgeData && results.byAgeGroup && (
        <div className="results-comparison">
          {/* Legend */}
          <div className="comparison-legend">
            {ageGroups.map((age) => (
              <div key={age} className="legend-item">
                <span
                  className="legend-color"
                  style={{ backgroundColor: AGE_COLORS[age] || '#6366f1' }}
                />
                <span className="legend-label">
                  {AGE_LABELS[age] || age}
                  <span className="legend-count">({results.byAgeGroup![age].count})</span>
                </span>
              </div>
            ))}
          </div>

          {/* Comparison Chart */}
          <div className="comparison-chart">
            {options.map((option, optIndex) => (
              <div key={optIndex} className="comparison-row">
                <div className="comparison-label">{option.text}</div>
                <div className="comparison-bars">
                  {ageGroups.map((age) => {
                    const pct = results.byAgeGroup![age].options[optIndex];
                    return (
                      <div key={age} className="comparison-bar-container">
                        <div
                          className="comparison-bar"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: AGE_COLORS[age] || '#6366f1',
                          }}
                        />
                        <span className="comparison-value">{pct.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {((activeTab === 'gender' && !hasGenderData) ||
        (activeTab === 'age' && !hasAgeData)) && (
        <div className="results-empty">
          교차분석을 위한 데이터가 아직 부족합니다. (최소 5명 이상 필요)
        </div>
      )}
    </div>
  );
};

export default Results;
