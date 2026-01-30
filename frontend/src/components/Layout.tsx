import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from '@clerk/clerk-react';
import { useTheme } from '../hooks/useTheme';
import { useAdmin } from '../hooks/useAdmin';

const ThemeIcon = ({ isDark }: { isDark: boolean }) => {
  if (isDark) {
    return <span>🌙</span>;
  }
  return <span>☀️</span>;
};

const NAV_ITEMS = [
  { path: '/', label: '홈', icon: '🏠' },
  { path: '/ranking', label: '랭킹', icon: '🏆' },
  { path: '/explore', label: '탐색', icon: '🔍' },
  { path: '/create', label: '만들기', icon: '✏️' },
  { path: '/profile', label: '프로필', icon: '👤' },
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
            <Link to="/insights" className="mobile-insights-link">📊</Link>
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
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`mobile-nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="mobile-nav-icon">{item.icon}</span>
            <span className="mobile-nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
