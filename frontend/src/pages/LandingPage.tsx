import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';

const LandingPage = () => {
  const { data: insightsData } = useQuery({
    queryKey: ['insights'],
    queryFn: () => apiClient.getInsights(),
    staleTime: 5 * 60 * 1000,
  });

  const stats = insightsData?.data?.totals;

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="landing-hero-full">
        <div className="hero-bg-pattern" />

        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-pulse" />
            <span>실시간 투표 진행 중</span>
          </div>

          <h1 className="hero-title-large">
            <span className="title-accent">3초</span>만에
            <br />
            세상의 의견을 확인하세요
          </h1>

          <p className="hero-subtitle-large">
            간단한 투표로 트렌드를 만들고, 나와 비슷한 사람들을 발견하세요
          </p>

          <div className="hero-cta-large">
            <Link to="/feed" className="cta-primary-large">
              지금 투표하기
            </Link>
            <Link to="/create" className="cta-secondary-large">
              설문 만들기
            </Link>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="hero-stats-large">
            <div className="stat-item-large">
              <span className="stat-number-large">{stats.polls.toLocaleString()}</span>
              <span className="stat-label-large">설문</span>
            </div>
            <div className="stat-divider-large" />
            <div className="stat-item-large">
              <span className="stat-number-large">{stats.responses.toLocaleString()}</span>
              <span className="stat-label-large">투표</span>
            </div>
            <div className="stat-divider-large" />
            <div className="stat-item-large">
              <span className="stat-number-large">{stats.participants.toLocaleString()}</span>
              <span className="stat-label-large">참여자</span>
            </div>
          </div>
        )}
      </section>

      {/* Features Section */}
      <section className="landing-features">
        <h2 className="section-title">왜 VibePulse인가요?</h2>

        <div className="features-grid">
          <div className="feature-card-large">
            <span className="feature-icon-large">⚡</span>
            <h3>즉시 결과 확인</h3>
            <p>투표하는 순간 실시간으로 다른 사람들의 의견을 확인할 수 있어요</p>
          </div>

          <div className="feature-card-large">
            <span className="feature-icon-large">🧠</span>
            <h3>나만의 성향 분석</h3>
            <p>MBTI처럼 16가지 투표 성향 중 나는 어떤 타입인지 알아보세요</p>
          </div>

          <div className="feature-card-large">
            <span className="feature-icon-large">🔒</span>
            <h3>완벽한 익명 보장</h3>
            <p>개인정보 걱정 없이 솔직하게 의견을 표현하세요</p>
          </div>

          <div className="feature-card-large">
            <span className="feature-icon-large">📊</span>
            <h3>심층 분석</h3>
            <p>연령대, 성별, 지역별로 의견 차이를 비교해보세요</p>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="landing-how">
        <h2 className="section-title">이렇게 사용해요</h2>

        <div className="steps-container">
          <div className="step-item">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>투표하기</h3>
              <p>마음에 드는 설문에 투표하세요</p>
            </div>
          </div>
          <div className="step-arrow">→</div>
          <div className="step-item">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>결과 확인</h3>
              <p>다른 사람들의 선택을 바로 확인</p>
            </div>
          </div>
          <div className="step-arrow">→</div>
          <div className="step-item">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>성향 발견</h3>
              <p>나의 투표 성향 분석 결과 보기</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="landing-final-cta">
        <h2>지금 바로 시작하세요</h2>
        <p>가입 없이도 투표에 참여할 수 있어요</p>
        <Link to="/feed" className="cta-primary-large">
          투표하러 가기
        </Link>
      </section>
    </div>
  );
};

export default LandingPage;
