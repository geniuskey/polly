import { useState } from 'react';

interface Announcement {
  id: string;
  type: 'notice' | 'update' | 'event';
  title: string;
  content: string;
  date: string;
  isPinned?: boolean;
}

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: '1',
    type: 'notice',
    title: 'VibePulse 서비스 오픈!',
    content: `안녕하세요, VibePulse입니다.

많은 분들의 기대 속에 VibePulse가 정식 오픈했습니다!

VibePulse는 누구나 쉽게 설문을 만들고 참여할 수 있는 실시간 여론조사 플랫폼입니다.

주요 기능:
• 3초 만에 투표 참여
• 3분 만에 설문 생성
• 실시간 결과 확인
• 성별/연령대별 교차분석
• 나만의 성향 분석

앞으로도 지속적인 업데이트를 통해 더 나은 서비스를 제공하겠습니다.

감사합니다.`,
    date: '2025-01-31',
    isPinned: true,
  },
  {
    id: '2',
    type: 'update',
    title: '성향 분석 기능 추가',
    content: `새로운 기능이 추가되었습니다!

이제 프로필 페이지에서 나만의 투표 성향을 확인할 수 있습니다.
10개 이상의 투표에 참여하시면 MBTI처럼 나의 투표 성향을 분석해 드립니다.

• 동조형 vs 독립형
• 신중형 vs 직관형
• 얼리어답터 vs 후발주자
• 활동적 vs 관망형
• 다양성 추구 vs 선택적 참여

지금 바로 확인해 보세요!`,
    date: '2025-01-31',
  },
  {
    id: '3',
    type: 'event',
    title: '오픈 기념 이벤트 안내',
    content: `VibePulse 오픈을 기념하여 특별한 이벤트를 진행합니다!

📅 기간: 2025년 2월 1일 ~ 2월 28일

🎁 이벤트 내용:
1. 첫 설문 생성 시 보너스 XP 지급
2. 매주 가장 인기 있는 설문 작성자에게 특별 뱃지 부여
3. 100번째 투표 달성 시 기념 뱃지 지급

많은 참여 부탁드립니다!`,
    date: '2025-01-31',
  },
];

const TYPE_LABELS: Record<Announcement['type'], string> = {
  notice: '공지',
  update: '업데이트',
  event: '이벤트',
};

const AnnouncementsPage = () => {
  const [selectedId, setSelectedId] = useState<string | null>(
    ANNOUNCEMENTS.find((a) => a.isPinned)?.id || ANNOUNCEMENTS[0]?.id || null
  );

  const selectedAnnouncement = ANNOUNCEMENTS.find((a) => a.id === selectedId);

  return (
    <div className="static-page announcements-page">
      <h1>공지사항</h1>

      <div className="announcements-container">
        <div className="announcements-list">
          {ANNOUNCEMENTS.map((announcement) => (
            <button
              key={announcement.id}
              className={`announcement-item ${selectedId === announcement.id ? 'active' : ''} ${
                announcement.isPinned ? 'pinned' : ''
              }`}
              onClick={() => setSelectedId(announcement.id)}
            >
              <div className="announcement-meta">
                <span className={`announcement-type type-${announcement.type}`}>
                  {TYPE_LABELS[announcement.type]}
                </span>
                {announcement.isPinned && <span className="pinned-badge">고정</span>}
              </div>
              <h3 className="announcement-title">{announcement.title}</h3>
              <span className="announcement-date">{announcement.date}</span>
            </button>
          ))}
        </div>

        <div className="announcement-detail">
          {selectedAnnouncement ? (
            <>
              <div className="detail-header">
                <span className={`announcement-type type-${selectedAnnouncement.type}`}>
                  {TYPE_LABELS[selectedAnnouncement.type]}
                </span>
                <h2>{selectedAnnouncement.title}</h2>
                <span className="detail-date">{selectedAnnouncement.date}</span>
              </div>
              <div className="detail-content">
                {selectedAnnouncement.content.split('\n').map((line, i) => (
                  <p key={i}>{line || <br />}</p>
                ))}
              </div>
            </>
          ) : (
            <div className="no-selection">
              <p>공지사항을 선택해 주세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnnouncementsPage;
