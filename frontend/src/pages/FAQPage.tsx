import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_DATA: { category: string; items: FAQItem[] }[] = [
  {
    category: '서비스 이용',
    items: [
      {
        question: 'VibePulse는 무료인가요?',
        answer: '네, VibePulse의 기본 기능은 모두 무료입니다. 설문 생성, 투표 참여, 결과 확인 모두 무료로 이용하실 수 있습니다.',
      },
      {
        question: '회원가입 없이 투표할 수 있나요?',
        answer: '네, 회원가입 없이도 투표에 참여하실 수 있습니다. 다만, 설문 생성이나 나만의 성향 분석 등 일부 기능은 로그인이 필요합니다.',
      },
      {
        question: '설문은 어떻게 만드나요?',
        answer: '로그인 후 상단의 연필 아이콘(설문 만들기)을 클릭하면 설문 생성 페이지로 이동합니다. 질문과 2~4개의 선택지를 입력하고 등록하면 바로 설문이 생성됩니다.',
      },
      {
        question: '내가 만든 설문은 어디서 볼 수 있나요?',
        answer: '프로필 페이지에서 내가 만든 설문 목록을 확인할 수 있습니다. 각 설문의 참여 현황과 결과도 함께 볼 수 있습니다.',
      },
    ],
  },
  {
    category: '투표 및 결과',
    items: [
      {
        question: '투표는 한 번만 할 수 있나요?',
        answer: '네, 하나의 설문에 한 번만 투표할 수 있습니다. 중복 투표를 방지하여 신뢰할 수 있는 결과를 제공합니다.',
      },
      {
        question: '투표 후 결과는 바로 볼 수 있나요?',
        answer: '네, 투표 후 즉시 현재까지의 결과를 확인할 수 있습니다. 성별, 연령대별 교차분석 결과도 함께 제공됩니다.',
      },
      {
        question: '투표 결과의 교차분석은 어떻게 이루어지나요?',
        answer: '프로필에서 성별, 연령대 등의 정보 제공에 동의한 사용자의 데이터만 교차분석에 활용됩니다. 최소 5명 이상의 표본이 있을 때만 결과가 표시되어 개인 식별을 방지합니다.',
      },
      {
        question: '투표를 취소하거나 수정할 수 있나요?',
        answer: '투표의 신뢰성을 위해 한 번 투표한 후에는 취소나 수정이 불가능합니다. 투표 전에 신중하게 선택해 주세요.',
      },
    ],
  },
  {
    category: '프라이버시',
    items: [
      {
        question: '내 투표 내역이 다른 사람에게 보이나요?',
        answer: '아니요, 개인의 투표 내역은 본인만 볼 수 있습니다. 다른 사용자에게는 전체 통계만 표시됩니다.',
      },
      {
        question: '프로필 정보는 어떻게 활용되나요?',
        answer: 'VibePulse는 "프로필 공개"가 아닌 "통계 분석에 속성 제공" 방식을 사용합니다. 귀하의 프로필과 개별 투표가 직접 연결되어 노출되지 않으며, 집계된 통계 데이터에만 활용됩니다.',
      },
      {
        question: '프로필 정보 제공은 필수인가요?',
        answer: '아니요, 선택사항입니다. 프로필 설정에서 각 항목(성별, 연령대, 지역)별로 통계 분석 제공 동의를 개별적으로 관리할 수 있습니다.',
      },
    ],
  },
  {
    category: '계정 관리',
    items: [
      {
        question: '회원 탈퇴는 어떻게 하나요?',
        answer: '프로필 설정에서 회원 탈퇴를 진행할 수 있습니다. 탈퇴 시 모든 개인정보는 즉시 삭제되며, 생성한 설문은 익명화되어 유지됩니다.',
      },
      {
        question: '다른 소셜 계정으로 로그인할 수 있나요?',
        answer: '현재 카카오, 네이버, 구글 계정으로 로그인할 수 있습니다. 하나의 VibePulse 계정에는 하나의 소셜 계정만 연동됩니다.',
      },
    ],
  },
];

const FAQPage = () => {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (key: string) => {
    setOpenItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  return (
    <div className="static-page faq-page">
      <h1>자주 묻는 질문</h1>
      <p className="faq-intro">
        VibePulse 이용에 관해 자주 묻는 질문들을 모았습니다.
        원하는 답변을 찾지 못하셨다면 <a href="/contact">문의하기</a>를 이용해 주세요.
      </p>

      {FAQ_DATA.map((category) => (
        <section key={category.category} className="faq-category">
          <h2>{category.category}</h2>
          <div className="faq-list">
            {category.items.map((item, index) => {
              const key = `${category.category}-${index}`;
              const isOpen = openItems.has(key);
              return (
                <div key={key} className={`faq-item ${isOpen ? 'open' : ''}`}>
                  <button
                    className="faq-question"
                    onClick={() => toggleItem(key)}
                    aria-expanded={isOpen}
                  >
                    <span>{item.question}</span>
                    <span className="faq-icon">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && (
                    <div className="faq-answer">
                      <p>{item.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};

export default FAQPage;
