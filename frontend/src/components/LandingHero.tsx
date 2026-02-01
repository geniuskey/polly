import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';

interface LandingHeroProps {
  onScrollToPolls?: () => void;
}

const LandingHero = ({ onScrollToPolls }: LandingHeroProps) => {
  const { data: insightsData } = useQuery({
    queryKey: ['insights'],
    queryFn: () => apiClient.getInsights(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const stats = insightsData?.data?.totals;

  const handleScrollClick = () => {
    onScrollToPolls?.();
  };

  return (
    <section className="landing-hero">
      {/* Hero Main */}
      <div className="hero-main">
        <div className="hero-badge">
          <span className="badge-pulse" />
          <span>실시간 투표 진행 중</span>
        </div>
        <h1 className="hero-title">
          <span className="title-accent">3초</span>만에
          <br />
          세상의 의견을 확인하세요
        </h1>
        <p className="hero-subtitle">
          당신의 한 표가 트렌드를 만듭니다
        </p>
        <div className="hero-cta">
          <button className="cta-primary" onClick={handleScrollClick}>
            지금 투표하기
          </button>
          <Link to="/create" className="cta-secondary">
            설문 만들기
          </Link>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="hero-stats">
          <div className="stat-item">
            <span className="stat-number">{stats.polls.toLocaleString()}</span>
            <span className="stat-label">설문</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-number">{stats.responses.toLocaleString()}</span>
            <span className="stat-label">투표</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-number">{stats.participants.toLocaleString()}</span>
            <span className="stat-label">참여자</span>
          </div>
        </div>
      )}

      {/* Features */}
      <div className="hero-features">
        <div className="feature-item">
          <span className="feature-icon">⚡</span>
          <div className="feature-text">
            <span className="feature-title">즉시 결과 확인</span>
            <span className="feature-desc">투표 즉시 실시간 통계</span>
          </div>
        </div>
        <div className="feature-item">
          <span className="feature-icon">🧠</span>
          <div className="feature-text">
            <span className="feature-title">성향 분석</span>
            <span className="feature-desc">MBTI 스타일 16유형</span>
          </div>
        </div>
        <div className="feature-item">
          <span className="feature-icon">🔒</span>
          <div className="feature-text">
            <span className="feature-title">익명 보장</span>
            <span className="feature-desc">안심하고 솔직하게</span>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <button className="scroll-indicator" onClick={handleScrollClick}>
        <span>아래로 스크롤해서 투표하기</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
        </svg>
      </button>
    </section>
  );
};

export default LandingHero;
