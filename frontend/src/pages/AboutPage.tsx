const AboutPage = () => {
  return (
    <div className="static-page">
      <h1>VibePulse 소개</h1>

      <section className="about-hero">
        <p className="about-tagline">
          당신의 의견이 세상을 바꿉니다
        </p>
        <p className="about-description">
          VibePulse는 누구나 쉽게 설문을 만들고 참여할 수 있는
          실시간 여론조사 플랫폼입니다.
        </p>
      </section>

      <section className="about-section">
        <h2>왜 VibePulse인가요?</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <span className="feature-icon">3"</span>
            <h3>3초 투표</h3>
            <p>복잡한 절차 없이 터치 한 번으로 의견을 표현하세요.</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">3'</span>
            <h3>3분 설문 등록</h3>
            <p>간단한 질문과 선택지만 있으면 바로 설문을 시작할 수 있어요.</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">~</span>
            <h3>실시간 결과</h3>
            <p>투표 즉시 다른 사람들의 의견을 확인할 수 있습니다.</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">#</span>
            <h3>성향 분석</h3>
            <p>나의 투표 패턴을 분석해 MBTI처럼 성향을 알려드려요.</p>
          </div>
        </div>
      </section>

      <section className="about-section">
        <h2>이런 분들께 추천해요</h2>
        <ul className="target-list">
          <li>심심할 때 가볍게 투표를 즐기고 싶은 분</li>
          <li>빠르게 의견을 수렴하고 싶은 동아리/팀/소상공인</li>
          <li>저렴하게 설문 데이터가 필요한 대학원생/스타트업</li>
          <li>내 의견이 다수인지 소수인지 궁금한 분</li>
        </ul>
      </section>

      <section className="about-section">
        <h2>프라이버시</h2>
        <p>
          VibePulse는 "프로필 공개"가 아닌 "통계 분석에 속성 제공" 방식을 채택합니다.
          개별 응답과 개인 프로필이 직접 연결되어 노출되지 않으며,
          교차분석 결과는 충분한 표본이 모였을 때만 표시됩니다.
        </p>
      </section>

      <section className="about-section about-contact">
        <h2>문의</h2>
        <p>
          서비스 관련 문의나 제안은 언제든 환영합니다.
        </p>
        <a href="/contact" className="contact-link">문의하기</a>
      </section>
    </div>
  );
};

export default AboutPage;
