import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { requireAuth } from '../middleware/auth';
import { error, success } from '../utils/response';

const images = new Hono<{ Bindings: Env; Variables: Variables }>();

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// POST /api/images/upload - Upload image to R2
images.post('/upload', requireAuth, async (c) => {
  try {
    const contentType = c.req.header('Content-Type') || '';

    // Handle multipart form data
    if (!contentType.includes('multipart/form-data')) {
      return error(c, 'INVALID_CONTENT_TYPE', 'multipart/form-data 형식이어야 합니다', 400);
    }

    const formData = await c.req.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return error(c, 'NO_FILE', '이미지 파일이 필요합니다', 400);
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return error(c, 'INVALID_TYPE', 'JPEG, PNG, WebP, GIF만 허용됩니다', 400);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return error(c, 'FILE_TOO_LARGE', '파일 크기는 5MB 이하여야 합니다', 400);
    }

    // Generate unique filename
    const extension = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const filename = `poll-options/${timestamp}-${random}.${extension}`;

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();
    await c.env.vibepulse_images.put(filename, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000', // 1 year cache
      },
    });

    // Generate public URL
    // Note: You need to configure R2 public access or use a custom domain
    // For now, we'll return a relative path that can be served via Workers
    const imageUrl = `/api/images/${filename}`;

    return success(c, { imageUrl });
  } catch (err) {
    console.error('Image upload error:', err);
    return error(c, 'UPLOAD_FAILED', '이미지 업로드에 실패했습니다', 500);
  }
});

// GET /api/images/:key+ - Serve image from R2
images.get('/:key{.+}', async (c) => {
  const key = c.req.param('key');

  try {
    const object = await c.env.vibepulse_images.get(key);

    if (!object) {
      return c.notFound();
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('ETag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000');

    return new Response(object.body, { headers });
  } catch (err) {
    console.error('Image fetch error:', err);
    return c.notFound();
  }
});

// DELETE /api/images/:key+ - Delete image from R2 (admin only)
images.delete('/:key{.+}', requireAuth, async (c) => {
  const key = c.req.param('key');
  const isAdmin = c.get('isAdmin');

  if (!isAdmin) {
    return error(c, 'FORBIDDEN', '권한이 없습니다', 403);
  }

  try {
    await c.env.vibepulse_images.delete(key);
    return success(c, { deleted: true });
  } catch (err) {
    console.error('Image delete error:', err);
    return error(c, 'DELETE_FAILED', '이미지 삭제에 실패했습니다', 500);
  }
});

export default images;
