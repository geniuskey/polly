import { useState } from 'react';
import type { VoteResult } from '../types';

interface ResultsProps {
  results: VoteResult;
  options: string[];
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
  '60+': '60+',
};

type TabType = 'total' | 'gender' | 'age';

const Results = ({ results, options }: ResultsProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('total');

  const hasGenderData = results.byGender && Object.keys(results.byGender).length > 0;
  const hasAgeData = results.byAgeGroup && Object.keys(results.byAgeGroup).length > 0;

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
              <div className="result-label">{options[i]}</div>
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

      {activeTab === 'gender' && results.byGender && (
        <div className="results-segments">
          {Object.entries(results.byGender).map(([gender, segment]) => (
            <div key={gender} className="segment-group">
              <div className="segment-title">
                {GENDER_LABELS[gender] || gender}
                <span className="segment-count">({segment.count}명)</span>
              </div>
              <div className="results-bars">
                {segment.options.map((pct, i) => (
                  <div key={i} className="result-row compact">
                    <div className="result-label">{options[i]}</div>
                    <div className="result-bar-wrapper">
                      <div
                        className="result-bar-fill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="result-value">{pct.toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'age' && results.byAgeGroup && (
        <div className="results-segments">
          {Object.entries(results.byAgeGroup).map(([age, segment]) => (
            <div key={age} className="segment-group">
              <div className="segment-title">
                {AGE_LABELS[age] || age}
                <span className="segment-count">({segment.count}명)</span>
              </div>
              <div className="results-bars">
                {segment.options.map((pct, i) => (
                  <div key={i} className="result-row compact">
                    <div className="result-label">{options[i]}</div>
                    <div className="result-bar-wrapper">
                      <div
                        className="result-bar-fill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="result-value">{pct.toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
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
