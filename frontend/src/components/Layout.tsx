import { Link, Outlet } from 'react-router-dom';
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

const Layout = () => {
  const { toggleTheme, isDark } = useTheme();
  const { isAdmin } = useAdmin();

  return (
    <div className="app-layout">
      <header className="app-header">
        <Link to="/" className="logo">
          VibePulse
        </Link>
        <nav className="nav">
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
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
