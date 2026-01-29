import { cors } from 'hono/cors';
import type { Env } from '../types';

// 기본 허용 도메인 (환경변수가 없어도 작동하도록)
const DEFAULT_ALLOWED_ORIGINS = [
  'https://vibepulse.pages.dev',
  'http://localhost:5173',
  'http://localhost:3000',
];

export const corsMiddleware = () =>
  cors({
    origin: (origin, c) => {
      const env = c.env as Env;
      const envOrigins = env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()) || [];
      const allowed = [...DEFAULT_ALLOWED_ORIGINS, ...envOrigins];

      if (allowed.includes(origin)) {
        return origin;
      }
      // 개발 환경에서는 localhost 허용
      if (origin?.startsWith('http://localhost')) {
        return origin;
      }
      return '';
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  });
