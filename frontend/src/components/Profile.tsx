import { useEffect, useState } from 'react';
import { useProfile, useUpdateProfile } from '../hooks/useProfile';
import type { UpdateProfileRequest } from '../types';

const Profile = () => {
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
    <div className="profile">
      <h2>프로필 설정</h2>
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
    </div>
  );
};

export default Profile;
