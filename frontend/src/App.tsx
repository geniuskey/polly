import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import PollFeed from './components/PollFeed';
import CreatePoll from './components/CreatePoll';
import Profile from './components/Profile';
import PollDetailPage from './pages/PollDetailPage';
import AdminPage from './pages/AdminPage';
import RankingPage from './pages/RankingPage';
import ExplorePage from './pages/ExplorePage';
import InsightsPage from './pages/InsightsPage';
import { initKakao } from './lib/kakao';
import './App.css';

const App = () => {
  useEffect(() => {
    initKakao();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<PollFeed />} />
          <Route path="/poll/:id" element={<PollDetailPage />} />
          <Route path="/create" element={<CreatePoll />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/insights" element={<InsightsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
