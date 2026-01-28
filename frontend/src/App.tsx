import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import PollFeed from './components/PollFeed';
import CreatePoll from './components/CreatePoll';
import Profile from './components/Profile';
import './App.css';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<PollFeed />} />
          <Route path="/create" element={<CreatePoll />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
