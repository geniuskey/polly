import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useProfile, useUpdateProfile, useMyPolls, useMyVotes } from '../hooks/useProfile';
import { apiClient, type SimilarityStats } from '../lib/api';
import type { UpdateProfileRequest, Poll } from '../types';

type TabType = 'settings' | 'myPolls' | 'myVotes' | 'similarity';

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
  const [activeTab, setActiveTab] = useState<TabType>('similarity');

  return (
    <div className="profile">
      <h2>내 정보</h2>
      <div className="profile-tabs">
        <button
          className={`profile-tab ${activeTab === 'similarity' ? 'active' : ''}`}
          onClick={() => setActiveTab('similarity')}
        >
          나와 비슷한 사람
        </button>
        <button
          className={`profile-tab ${activeTab === 'myPolls' ? 'active' : ''}`}
          onClick={() => setActiveTab('myPolls')}
        >
          내 설문
        </button>
        <button
          className={`profile-tab ${activeTab === 'myVotes' ? 'active' : ''}`}
          onClick={() => setActiveTab('myVotes')}
        >
          투표한 설문
        </button>
        <button
          className={`profile-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          설정
        </button>
      </div>

      {activeTab === 'similarity' && <SimilarityPanel />}
      {activeTab === 'settings' && <ProfileSettings />}
      {activeTab === 'myPolls' && <MyPollsList />}
      {activeTab === 'myVotes' && <MyVotesList />}
    </div>
  );
};

export default Profile;
