import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { useAdmin } from '../hooks/useAdmin';
import {
  apiClient,
  type AdminStats,
  type AdminPoll,
  type AdminComment,
} from '../lib/api';

type Tab = 'stats' | 'polls' | 'comments';

const AdminPage = () => {
  const { isAdmin, isLoaded } = useAdmin();
  const [activeTab, setActiveTab] = useState<Tab>('stats');

  if (!isLoaded) {
    return <div className="admin-loading">로딩 중...</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="admin-page">
      <h1>관리자 대시보드</h1>

      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          통계
        </button>
        <button
          className={`admin-tab ${activeTab === 'polls' ? 'active' : ''}`}
          onClick={() => setActiveTab('polls')}
        >
          설문 관리
        </button>
        <button
          className={`admin-tab ${activeTab === 'comments' ? 'active' : ''}`}
          onClick={() => setActiveTab('comments')}
        >
          댓글 관리
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'stats' && <StatsPanel />}
        {activeTab === 'polls' && <PollsPanel />}
        {activeTab === 'comments' && <CommentsPanel />}
      </div>
    </div>
  );
};

const StatsPanel = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => apiClient.getAdminStats(),
  });

  if (isLoading) return <div className="admin-loading">통계 로딩 중...</div>;
  if (error) return <div className="admin-error">통계를 불러올 수 없습니다.</div>;

  const stats = data?.data as AdminStats;

  return (
    <div className="stats-panel">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totals.polls}</div>
          <div className="stat-label">전체 설문</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totals.responses}</div>
          <div className="stat-label">전체 응답</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totals.users}</div>
          <div className="stat-label">전체 사용자</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totals.comments}</div>
          <div className="stat-label">전체 댓글</div>
        </div>
      </div>

      <div className="stats-section">
        <h3>최근 24시간</h3>
        <div className="stats-row">
          <span>새 설문: {stats.last24h.polls}개</span>
          <span>새 응답: {stats.last24h.responses}개</span>
        </div>
      </div>

      <div className="stats-section">
        <h3>인기 설문 Top 10</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>질문</th>
              <th>응답 수</th>
            </tr>
          </thead>
          <tbody>
            {stats.topPolls.map((poll) => (
              <tr key={poll.id}>
                <td className="poll-question">{poll.question}</td>
                <td className="poll-count">{poll.response_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const PollsPanel = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'polls', statusFilter],
    queryFn: () =>
      apiClient.getAdminPolls({
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 50,
      }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.updateAdminPoll(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'polls'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteAdminPoll(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'polls'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });

  const handleDelete = (poll: AdminPoll) => {
    if (confirm(`"${poll.question}" 설문을 삭제하시겠습니까?\n모든 응답과 댓글도 함께 삭제됩니다.`)) {
      deleteMutation.mutate(poll.id);
    }
  };

  if (isLoading) return <div className="admin-loading">설문 로딩 중...</div>;
  if (error) return <div className="admin-error">설문을 불러올 수 없습니다.</div>;

  const polls = data?.polls || [];

  return (
    <div className="polls-panel">
      <div className="panel-controls">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
        >
          <option value="all">전체</option>
          <option value="active">활성</option>
          <option value="inactive">비활성</option>
        </select>
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th>질문</th>
            <th>응답</th>
            <th>상태</th>
            <th>생성일</th>
            <th>액션</th>
          </tr>
        </thead>
        <tbody>
          {polls.map((poll) => (
            <tr key={poll.id} className={!poll.isActive ? 'inactive-row' : ''}>
              <td className="poll-question">{poll.question}</td>
              <td className="poll-count">{poll.responseCount}</td>
              <td>
                <span className={`status-badge ${poll.isActive ? 'active' : 'inactive'}`}>
                  {poll.isActive ? '활성' : '비활성'}
                </span>
              </td>
              <td className="poll-date">
                {new Date(poll.createdAt).toLocaleDateString('ko-KR')}
              </td>
              <td className="poll-actions">
                <button
                  className="btn-toggle"
                  onClick={() => toggleMutation.mutate({ id: poll.id, isActive: !poll.isActive })}
                  disabled={toggleMutation.isPending}
                >
                  {poll.isActive ? '비활성화' : '활성화'}
                </button>
                <button
                  className="btn-delete"
                  onClick={() => handleDelete(poll)}
                  disabled={deleteMutation.isPending}
                >
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {polls.length === 0 && (
        <div className="empty-state">설문이 없습니다.</div>
      )}
    </div>
  );
};

const CommentsPanel = () => {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'comments'],
    queryFn: () => apiClient.getAdminComments({ limit: 50 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteAdminComment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });

  const handleDelete = (comment: AdminComment) => {
    if (confirm(`이 댓글을 삭제하시겠습니까?\n"${comment.content.substring(0, 50)}..."`)) {
      deleteMutation.mutate(comment.id);
    }
  };

  if (isLoading) return <div className="admin-loading">댓글 로딩 중...</div>;
  if (error) return <div className="admin-error">댓글을 불러올 수 없습니다.</div>;

  const comments = data?.comments || [];

  return (
    <div className="comments-panel">
      <table className="admin-table">
        <thead>
          <tr>
            <th>댓글</th>
            <th>설문</th>
            <th>작성일</th>
            <th>액션</th>
          </tr>
        </thead>
        <tbody>
          {comments.map((comment) => (
            <tr key={comment.id}>
              <td className="comment-content">{comment.content}</td>
              <td className="comment-poll">{comment.pollQuestion}</td>
              <td className="comment-date">
                {new Date(comment.createdAt).toLocaleDateString('ko-KR')}
              </td>
              <td className="comment-actions">
                <button
                  className="btn-delete"
                  onClick={() => handleDelete(comment)}
                  disabled={deleteMutation.isPending}
                >
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {comments.length === 0 && (
        <div className="empty-state">댓글이 없습니다.</div>
      )}
    </div>
  );
};

export default AdminPage;
