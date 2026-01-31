import { Hono } from 'hono';
import type { Env, Variables } from './types';
import { corsMiddleware } from './middleware/cors';
import polls from './routes/polls';
import users from './routes/users';
import comments from './routes/comments';
import tags from './routes/tags';
import admin from './routes/admin';
import explore from './routes/explore';
import images from './routes/images';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Global middleware
app.use('*', corsMiddleware());

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.route('/api/polls', polls);
app.route('/api/polls/:pollId/comments', comments);
app.route('/api/users', users);
app.route('/api/tags', tags);
app.route('/api/admin', admin);
app.route('/api/explore', explore);
app.route('/api/images', images);

// 404 handler
app.notFound((c) => {
  return c.json(
    { error: { code: 'NOT_FOUND', message: '요청한 리소스를 찾을 수 없습니다' } },
    404,
  );
});

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json(
    { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
    500,
  );
});

export default app;
