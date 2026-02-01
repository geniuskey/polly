import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useProfile, useUpdateProfile, useMyPolls, useMyVotes } from '../hooks/useProfile';
import { apiClient, type SimilarityStats, type XpStats, type PersonalityAnalysis } from '../lib/api';
import StatisticsPanel from './StatisticsPanel';
import type { UpdateProfileRequest, Poll } from '../types';

type TabType = 'personality' | 'xp' | 'statistics' | 'settings' | 'activity' | 'similarity';

const ProfileSettings = () => {
  const { data: profileData, isLoading } = useProfile();
  const { mutateAsync: updateProfile, isPending } = useUpdateProfile();

  const [form, setForm] = useState<UpdateProfileRequest>({
    gender: null,
    ageGroup: null,
    region: null,
    shareGender: false,
    shareAgeGroup: false,
    shareRegion: false,
  });

  useEffect(() => {
    if (profileData?.data) {
      const p = profileData.data;
      setForm({
        gender: p.gender,
        ageGroup: p.ageGroup,
        region: p.region,
        shareGender: p.shareGender,
        shareAgeGroup: p.shareAgeGroup,
        shareRegion: p.shareRegion,
      });
    }
  }, [profileData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile(form);
      alert('프로필이 저장되었습니다.');
    } catch {
      alert('프로필 저장에 실패했습니다.');
    }
  };

  if (isLoading) return <div className="loading">로딩 중...</div>;

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="gender">성별</label>
        <select
          id="gender"
          value={form.gender || ''}
          onChange={(e) =>
            setForm({ ...form, gender: e.target.value || null })
          }
        >
          <option value="">선택 안 함</option>
          <option value="male">남성</option>
          <option value="female">여성</option>
          <option value="other">기타</option>
        </select>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.shareGender || false}
            onChange={(e) =>
              setForm({ ...form, shareGender: e.target.checked })
            }
          />
          통계 분석에 성별 정보 제공
        </label>
      </div>

      <div className="form-group">
        <label htmlFor="ageGroup">연령대</label>
        <select
          id="ageGroup"
          value={form.ageGroup || ''}
          onChange={(e) =>
            setForm({ ...form, ageGroup: e.target.value || null })
          }
        >
          <option value="">선택 안 함</option>
          <option value="10s">10대</option>
          <option value="20s">20대</option>
          <option value="30s">30대</option>
          <option value="40s">40대</option>
          <option value="50s">50대</option>
          <option value="60+">60대 이상</option>
        </select>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.shareAgeGroup || false}
            onChange={(e) =>
              setForm({ ...form, shareAgeGroup: e.target.checked })
            }
          />
          통계 분석에 연령대 정보 제공
        </label>
      </div>

      <div className="form-group">
        <label htmlFor="region">지역</label>
        <select
          id="region"
          value={form.region || ''}
          onChange={(e) =>
            setForm({ ...form, region: e.target.value || null })
          }
        >
          <option value="">선택 안 함</option>
          <option value="서울">서울</option>
          <option value="경기">경기</option>
          <option value="인천">인천</option>
          <option value="부산">부산</option>
          <option value="대구">대구</option>
          <option value="대전">대전</option>
          <option value="광주">광주</option>
          <option value="울산">울산</option>
          <option value="세종">세종</option>
          <option value="강원">강원</option>
          <option value="충북">충북</option>
          <option value="충남">충남</option>
          <option value="전북">전북</option>
          <option value="전남">전남</option>
          <option value="경북">경북</option>
          <option value="경남">경남</option>
          <option value="제주">제주</option>
        </select>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.shareRegion || false}
            onChange={(e) =>
              setForm({ ...form, shareRegion: e.target.checked })
            }
          />
          통계 분석에 지역 정보 제공
        </label>
      </div>

      <p className="privacy-notice">
        제공된 정보는 통계적 교차분석에만 사용되며, 개별 프로필이 다른
        사용자에게 공개되지 않습니다.
      </p>

      <button
        type="submit"
        className="submit-btn"
        disabled={isPending}
      >
        {isPending ? '저장 중...' : '프로필 저장'}
      </button>
    </form>
  );
};

const PollListItem = ({ poll }: { poll: Poll }) => (
  <Link to={`/poll/${poll.id}`} className="poll-list-item">
    <div className="poll-card">
      <div className="poll-card-header">
        {poll.category && (
          <span className="poll-category">{poll.category}</span>
        )}
        <span className="poll-responses">{poll.responseCount || 0}명 참여</span>
      </div>
      <p className="poll-question">{poll.question}</p>
    </div>
  </Link>
);

const MyPollsList = () => {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useMyPolls();
  const polls = data?.pages.flatMap((page) => page.polls) ?? [];

  if (isLoading) return <div className="loading">로딩 중...</div>;
  if (isError) return <div className="error-state"><p>불러오기 실패</p></div>;
  if (polls.length === 0) return <div className="empty">아직 만든 설문이 없습니다.</div>;

  return (
    <div className="poll-list">
      {polls.map((poll) => (
        <PollListItem key={poll.id} poll={poll} />
      ))}
      {hasNextPage && (
        <button
          className="load-more"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? '불러오는 중...' : '더 보기'}
        </button>
      )}
    </div>
  );
};

const MyVotesList = () => {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useMyVotes();
  const polls = data?.pages.flatMap((page) => page.polls) ?? [];

  if (isLoading) return <div className="loading">로딩 중...</div>;
  if (isError) return <div className="error-state"><p>불러오기 실패</p></div>;
  if (polls.length === 0) return <div className="empty">아직 투표한 설문이 없습니다.</div>;

  return (
    <div className="poll-list">
      {polls.map((poll) => (
        <PollListItem key={poll.id} poll={poll} />
      ))}
      {hasNextPage && (
        <button
          className="load-more"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? '불러오는 중...' : '더 보기'}
        </button>
      )}
    </div>
  );
};

const ActivityPanel = () => {
  return (
    <div className="activity-panel">
      <section className="activity-section">
        <h4>내 설문</h4>
        <MyPollsList />
      </section>
      <section className="activity-section">
        <h4>투표 기록</h4>
        <MyVotesList />
      </section>
    </div>
  );
};

const PersonalityPanel = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['myPersonality'],
    queryFn: () => apiClient.getMyPersonality(),
  });

  if (isLoading) return <div className="loading">분석 중...</div>;
  if (isError) return <div className="error-state"><p>불러오기 실패</p></div>;

  const analysis = data?.data as PersonalityAnalysis;

  if (!analysis.hasData) {
    const progress = analysis.totalVotes && analysis.requiredVotes
      ? Math.round((analysis.totalVotes / analysis.requiredVotes) * 100)
      : 0;

    return (
      <div className="personality-panel">
        <div className="personality-empty">
          <div className="empty-icon">🎯</div>
          <p>{analysis.message}</p>
          {analysis.totalVotes !== undefined && analysis.requiredVotes && (
            <div className="personality-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <span className="progress-text">{analysis.totalVotes} / {analysis.requiredVotes}</span>
            </div>
          )}
          <Link to="/" className="go-vote-btn">투표하러 가기</Link>
        </div>
      </div>
    );
  }

  const dimensions = analysis.dimensions!;
  const type = analysis.type!;

  // 4차원 MBTI 스타일 배열
  const dimensionList = [
    { key: 'mi', ...dimensions.mi },
    { key: 'fc', ...dimensions.fc },
    { key: 'el', ...dimensions.el },
    { key: 'wd', ...dimensions.wd },
  ];

  return (
    <div className="personality-panel">
      {/* MBTI Type Card */}
      <div className="personality-type-card mbti-style">
        <div className="type-code-badge">{type.code}</div>
        <div className="type-main">
          <div className="type-emoji">{type.emoji}</div>
          <div className="type-info">
            <h3 className="type-name">{type.name}</h3>
            <p className="type-title">{type.title}</p>
          </div>
        </div>
        <p className="type-description">{type.description}</p>
        {type.traits && (
          <div className="type-traits">
            {type.traits.map((trait, i) => (
              <span key={i} className="trait-tag">{trait}</span>
            ))}
          </div>
        )}
      </div>

      {/* 4 Dimensions */}
      <div className="personality-dimensions mbti-dimensions">
        <h4>4차원 성향 분석</h4>
        {dimensionList.map((dim) => (
          <div key={dim.key} className="dimension-row">
            <div className="dimension-labels">
              <span className={`dimension-label ${dim.score < 50 ? 'active' : ''}`}>
                {dim.lowLabel}
              </span>
              <span className="dimension-letter">{dim.letter}</span>
              <span className={`dimension-label ${dim.score >= 50 ? 'active' : ''}`}>
                {dim.highLabel}
              </span>
            </div>
            <div className="dimension-bar-container">
              <div className="dimension-bar">
                <div
                  className="dimension-fill"
                  style={{ width: `${dim.score}%` }}
                />
                <div
                  className="dimension-marker"
                  style={{ left: `${dim.score}%` }}
                />
              </div>
              <span className="dimension-score">{dim.score}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="personality-summary">
        <div className="summary-stat">
          <span className="summary-value">{analysis.summary!.withMajority}%</span>
          <span className="summary-label">다수와 일치</span>
        </div>
        <div className="summary-stat highlight">
          <span className="summary-value">{analysis.summary!.uniqueness}%</span>
          <span className="summary-label">독특함 지수</span>
        </div>
        <div className="summary-stat">
          <span className="summary-value">{analysis.totalVotes}</span>
          <span className="summary-label">총 투표</span>
        </div>
      </div>

      {/* Recent Polls */}
      {analysis.recentPolls && analysis.recentPolls.length > 0 && (
        <div className="personality-recent">
          <h4>최근 투표 기록</h4>
          <p className="recent-summary">{analysis.summary!.recentMatch}</p>
          <ul className="recent-polls-list">
            {analysis.recentPolls.map((poll) => (
              <li key={poll.id} className={`recent-poll-item ${poll.withMajority ? 'with-majority' : 'unique'}`}>
                <span className="poll-indicator">{poll.withMajority ? '👥' : '🦅'}</span>
                <Link to={`/poll/${poll.id}`} className="poll-question-link">
                  {poll.question}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const XpPanel = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['myXp'],
    queryFn: () => apiClient.getMyXp(),
  });

  if (isLoading) return <div className="loading">로딩 중...</div>;
  if (isError) return <div className="error-state"><p>불러오기 실패</p></div>;

  const stats = data?.data as XpStats;
  const xpInCurrentLevel = stats.xp - stats.xpForCurrentLevel;
  const xpNeededForNext = stats.xpForNextLevel - stats.xpForCurrentLevel;

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'vote': return '투표';
      case 'vote_with_daily_bonus': return '투표 + 일일 보너스';
      case 'create_poll': return '설문 생성';
      case 'comment': return '댓글 작성';
      default: return reason;
    }
  };

  return (
    <div className="xp-panel">
      <div className="xp-hero">
        <div className="xp-level-badge">
          <span className="level-number">Lv.{stats.level}</span>
          <span className="level-title">{stats.title}</span>
        </div>
        <div className="xp-total">
          <span className="xp-value">{stats.xp.toLocaleString()}</span>
          <span className="xp-label">XP</span>
        </div>
      </div>

      <div className="xp-progress-section">
        <div className="xp-progress-header">
          <span>다음 레벨까지</span>
          <span>{xpInCurrentLevel} / {xpNeededForNext} XP</span>
        </div>
        <div className="xp-progress-bar">
          <div
            className="xp-progress-fill"
            style={{ width: `${stats.progress}%` }}
          />
        </div>
        <p className="xp-progress-hint">
          {xpNeededForNext - xpInCurrentLevel} XP 더 모으면 레벨 업!
        </p>
      </div>

      <div className="xp-rewards-info">
        <h4>XP 획득 방법</h4>
        <ul>
          <li><span className="reward-action">투표하기</span> <span className="reward-xp">+10 XP</span></li>
          <li><span className="reward-action">설문 만들기</span> <span className="reward-xp">+30 XP</span></li>
          <li><span className="reward-action">댓글 작성</span> <span className="reward-xp">+5 XP</span></li>
          <li><span className="reward-action">매일 첫 투표</span> <span className="reward-xp">+10 XP 보너스</span></li>
        </ul>
      </div>

      {stats.history.length > 0 && (
        <div className="xp-history">
          <h4>최근 활동</h4>
          <ul className="xp-history-list">
            {stats.history.map((entry) => (
              <li key={entry.id} className="xp-history-item">
                <span className="history-reason">{getReasonLabel(entry.reason)}</span>
                <span className="history-xp">+{entry.amount} XP</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const SimilarityPanel = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['similarity'],
    queryFn: () => apiClient.getMySimilarity(),
  });

  if (isLoading) return <div className="loading">분석 중...</div>;
  if (isError) return <div className="error-state"><p>불러오기 실패</p></div>;

  const stats = data?.data as SimilarityStats;

  return (
    <div className="similarity-panel">
      <div className="similarity-hero">
        <div className="similarity-emoji">👥</div>
        <p className="similarity-message-text">{stats.message}</p>
      </div>

      <div className="similarity-stats">
        <div className="similarity-stat">
          <span className="stat-number">{stats.totalVotes}</span>
          <span className="stat-label">총 투표 수</span>
        </div>
        <div className="similarity-stat">
          <span className="stat-number">{stats.similarUsers}</span>
          <span className="stat-label">비슷한 사람</span>
        </div>
        {stats.topSimilarity > 0 && (
          <div className="similarity-stat highlight">
            <span className="stat-number">{stats.topSimilarity}%</span>
            <span className="stat-label">최고 유사도</span>
          </div>
        )}
        {stats.comparedWith !== undefined && stats.comparedWith > 0 && (
          <div className="similarity-stat">
            <span className="stat-number">{stats.comparedWith}</span>
            <span className="stat-label">비교 대상</span>
          </div>
        )}
      </div>

      {stats.totalVotes < 3 && (
        <div className="similarity-tip">
          <p>더 많은 설문에 참여하면 취향이 비슷한 사람을 찾아드려요!</p>
          <Link to="/" className="go-vote-btn">투표하러 가기</Link>
        </div>
      )}

      {stats.similarUsers > 0 && (
        <div className="similarity-explanation">
          <p>
            <strong>비슷한 사람</strong>이란?<br />
            같은 설문에서 3개 이상 겹치고, 그 중 70% 이상 같은 선택을 한 사람이에요.
          </p>
        </div>
      )}
    </div>
  );
};

const Profile = () => {
  const [activeTab, setActiveTab] = useState<TabType>('personality');

  return (
    <div className="profile">
      <h2>내 정보</h2>
      <div className="profile-tabs">
        <button
          className={`profile-tab ${activeTab === 'personality' ? 'active' : ''}`}
          onClick={() => setActiveTab('personality')}
        >
          내 성향
        </button>
        <button
          className={`profile-tab ${activeTab === 'statistics' ? 'active' : ''}`}
          onClick={() => setActiveTab('statistics')}
        >
          통계
        </button>
        <button
          className={`profile-tab ${activeTab === 'xp' ? 'active' : ''}`}
          onClick={() => setActiveTab('xp')}
        >
          레벨
        </button>
        <button
          className={`profile-tab ${activeTab === 'similarity' ? 'active' : ''}`}
          onClick={() => setActiveTab('similarity')}
        >
          비슷한 사람
        </button>
        <button
          className={`profile-tab ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          활동
        </button>
        <button
          className={`profile-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          설정
        </button>
      </div>

      {activeTab === 'personality' && <PersonalityPanel />}
      {activeTab === 'statistics' && <StatisticsPanel />}
      {activeTab === 'xp' && <XpPanel />}
      {activeTab === 'similarity' && <SimilarityPanel />}
      {activeTab === 'activity' && <ActivityPanel />}
      {activeTab === 'settings' && <ProfileSettings />}
    </div>
  );
};

export default Profile;
