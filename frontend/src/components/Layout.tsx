import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from '@clerk/clerk-react';
import { useTheme } from '../hooks/useTheme';
import { useAdmin } from '../hooks/useAdmin';

// SVG Line Icons
const IconHome = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const IconTrophy = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

const IconSearch = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const IconPencil = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

const IconUser = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="5" />
    <path d="M20 21a8 8 0 0 0-16 0" />
  </svg>
);

const IconChart = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" />
    <path d="m19 9-5 5-4-4-3 3" />
  </svg>
);

const IconSun = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </svg>
);

const IconMoon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

const ThemeIcon = ({ isDark }: { isDark: boolean }) => {
  return isDark ? <IconMoon /> : <IconSun />;
};

const NAV_ITEMS = [
  { path: '/', label: '홈', icon: IconHome },
  { path: '/ranking', label: '랭킹', icon: IconTrophy },
  { path: '/explore', label: '탐색', icon: IconSearch },
  { path: '/create', label: '만들기', icon: IconPencil },
  { path: '/profile', label: '프로필', icon: IconUser },
];

const Layout = () => {
  const { toggleTheme, isDark } = useTheme();
  const { isAdmin } = useAdmin();
  const location = useLocation();

  return (
    <div className="app-layout">
      {/* Desktop Header */}
      <header className="app-header">
        <Link to="/" className="logo">
          VibePulse
        </Link>
        <nav className="nav desktop-nav">
          <Link to="/">홈</Link>
          <Link to="/ranking">랭킹</Link>
          <Link to="/explore">탐색</Link>
          <Link to="/insights">인사이트</Link>
          <Link to="/create">만들기</Link>
          <SignedIn>
            <Link to="/profile">프로필</Link>
            {isAdmin && <Link to="/admin" className="admin-link">관리자</Link>}
            <UserButton />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="sign-in-btn">로그인</button>
            </SignInButton>
          </SignedOut>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="테마 변경"
          >
            <ThemeIcon isDark={isDark} />
          </button>
        </nav>

        {/* Mobile Header - simplified */}
        <div className="mobile-header-actions">
          <SignedIn>
            {isAdmin && <Link to="/admin" className="admin-link mobile-admin">관리</Link>}
            <Link to="/insights" className="mobile-insights-link"><IconChart /></Link>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="sign-in-btn mobile-sign-in">로그인</button>
            </SignInButton>
          </SignedOut>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="테마 변경"
          >
            <ThemeIcon isDark={isDark} />
          </button>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`mobile-nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="mobile-nav-icon"><Icon /></span>
              <span className="mobile-nav-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default Layout;
