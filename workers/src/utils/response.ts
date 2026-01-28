import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export const success = <T>(c: Context, data: T, status: ContentfulStatusCode = 200) => {
  return c.json({ data }, status);
};

export const paginated = <T>(
  c: Context,
  items: T[],
  nextCursor: string | null,
  key: string,
) => {
  return c.json({ [key]: items, nextCursor });
};

export const error = (
  c: Context,
  code: string,
  message: string,
  status: ContentfulStatusCode,
) => {
  return c.json({ error: { code, message } }, status);
};
