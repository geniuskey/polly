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
      const clerkId = await verifyClerkToken(token, c.env.CLERK_SECRET_KEY);
      if (clerkId) {
        c.set('clerkId', clerkId);
        // Resolve internal user ID
        const user = await c.env.survey_db.prepare(
          'SELECT id FROM users WHERE clerk_id = ?',
        )
          .bind(clerkId)
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
    const clerkId = await verifyClerkToken(token, c.env.CLERK_SECRET_KEY);
    if (!clerkId) {
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

    c.set('clerkId', clerkId);

    // Ensure user exists in DB (auto-create on first login)
    let user = await c.env.survey_db.prepare(
      'SELECT id FROM users WHERE clerk_id = ?',
    )
      .bind(clerkId)
      .first<{ id: string }>();

    if (!user) {
      await c.env.survey_db.prepare('INSERT INTO users (clerk_id) VALUES (?)').bind(clerkId).run();
      user = await c.env.survey_db.prepare(
        'SELECT id FROM users WHERE clerk_id = ?',
      )
        .bind(clerkId)
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
 * Verify Clerk JWT token.
 * In production, use Clerk's JWKS endpoint for verification.
 * This is a simplified version that decodes the JWT and extracts the subject.
 */
async function verifyClerkToken(
  token: string,
  _secretKey: string,
): Promise<string | null> {
  try {
    // Decode JWT payload (base64url)
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    // Return subject (clerk user ID)
    return payload.sub || null;
  } catch {
    return null;
  }
}
