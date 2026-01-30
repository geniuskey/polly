import type { MiddlewareHandler } from 'hono';
import type { Env, Variables } from '../types';

/**
 * Optional auth middleware: extracts clerk_id from token if present.
 * Does not reject requests without auth.
 */
export const optionalAuth: MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const payload = await verifyClerkToken(token, c.env.CLERK_SECRET_KEY);
      if (payload?.sub) {
        c.set('clerkId', payload.sub);
        if (payload.email) {
          c.set('userEmail', payload.email);
          c.set('isAdmin', isAdminEmail(payload.email, c.env.ADMIN_EMAILS));
        }
        // Resolve internal user ID
        const user = await c.env.survey_db.prepare(
          'SELECT id FROM users WHERE clerk_id = ?',
        )
          .bind(payload.sub)
          .first<{ id: string }>();
        if (user) {
          c.set('userId', user.id);
        }
      }
    } catch {
      // Invalid token - continue as anonymous
    }
  }
  await next();
};

/**
 * Required auth middleware: rejects requests without valid auth.
 */
export const requireAuth: MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
      401,
    );
  }

  const token = authHeader.substring(7);
  try {
    const payload = await verifyClerkToken(token, c.env.CLERK_SECRET_KEY);
    if (!payload?.sub) {
      return c.json(
        {
          error: {
            code: 'INVALID_TOKEN',
            message: '유효하지 않은 토큰입니다',
          },
        },
        401,
      );
    }

    c.set('clerkId', payload.sub);
    if (payload.email) {
      c.set('userEmail', payload.email);
      c.set('isAdmin', isAdminEmail(payload.email, c.env.ADMIN_EMAILS));
    }

    // Ensure user exists in DB (auto-create on first login)
    let user = await c.env.survey_db.prepare(
      'SELECT id FROM users WHERE clerk_id = ?',
    )
      .bind(payload.sub)
      .first<{ id: string }>();

    if (!user) {
      await c.env.survey_db.prepare('INSERT INTO users (clerk_id) VALUES (?)').bind(payload.sub).run();
      user = await c.env.survey_db.prepare(
        'SELECT id FROM users WHERE clerk_id = ?',
      )
        .bind(payload.sub)
        .first<{ id: string }>();
    }

    if (user) {
      c.set('userId', user.id);
    }
  } catch {
    return c.json(
      {
        error: {
          code: 'INVALID_TOKEN',
          message: '유효하지 않은 토큰입니다',
        },
      },
      401,
    );
  }

  await next();
};

/**
 * Admin-only middleware: requires auth and admin privileges.
 */
export const requireAdmin: MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
      401,
    );
  }

  const token = authHeader.substring(7);
  try {
    const payload = await verifyClerkToken(token, c.env.CLERK_SECRET_KEY);
    if (!payload?.sub) {
      return c.json(
        { error: { code: 'INVALID_TOKEN', message: '유효하지 않은 토큰입니다' } },
        401,
      );
    }

    c.set('clerkId', payload.sub);
    if (payload.email) {
      c.set('userEmail', payload.email);
    }

    const isAdmin = isAdminEmail(payload.email, c.env.ADMIN_EMAILS);
    c.set('isAdmin', isAdmin);

    if (!isAdmin) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: '관리자 권한이 필요합니다' } },
        403,
      );
    }

    // Resolve internal user ID
    const user = await c.env.survey_db.prepare(
      'SELECT id FROM users WHERE clerk_id = ?',
    )
      .bind(payload.sub)
      .first<{ id: string }>();
    if (user) {
      c.set('userId', user.id);
    }
  } catch {
    return c.json(
      { error: { code: 'INVALID_TOKEN', message: '유효하지 않은 토큰입니다' } },
      401,
    );
  }

  await next();
};

interface ClerkJwtPayload {
  sub: string;
  email?: string;
  exp?: number;
}

/**
 * Verify Clerk JWT token.
 * In production, use Clerk's JWKS endpoint for verification.
 * This is a simplified version that decodes the JWT and extracts the subject.
 */
async function verifyClerkToken(
  token: string,
  _secretKey: string,
): Promise<ClerkJwtPayload | null> {
  try {
    // Decode JWT payload (base64url)
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      sub: payload.sub || null,
      email: payload.email || null,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

const DEFAULT_ADMIN_EMAILS = ['geniuskey@gmail.com'];

function isAdminEmail(email: string | undefined, adminEmailsEnv?: string): boolean {
  if (!email) return false;
  const adminEmails = adminEmailsEnv
    ? adminEmailsEnv.split(',').map((e) => e.trim().toLowerCase())
    : DEFAULT_ADMIN_EMAILS;
  return adminEmails.includes(email.toLowerCase());
}
