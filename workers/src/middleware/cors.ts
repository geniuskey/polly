import { cors } from 'hono/cors';
import type { Env } from '../types';

export const corsMiddleware = () =>
  cors({
    origin: (origin, c) => {
      const env = c.env as Env;
      const allowed = env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()) || [];
      if (allowed.includes(origin)) {
        return origin;
      }
      // 개발 환경에서는 localhost 허용
      if (env.ENVIRONMENT === 'development' && origin?.startsWith('http://localhost')) {
        return origin;
      }
      return '';
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  });
