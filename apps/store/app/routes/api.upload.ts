import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { requireUserSession } from '~/services/auth.server';
import { requirePermission } from '~/utils/permissions';
import { PERMISSIONS } from '@diner/config';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.env as { DB: D1Database; KV: KVNamespace; R2: R2Bucket; SESSION_SECRET?: string };
  const session = await requireUserSession(request, env);

  // Image uploads require menu edit access
  if (session.userId) {
    requirePermission(session as any, PERMISSIONS.MENU_FULL_ACCESS);
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return json({ error: 'Invalid file type (JPEG, PNG, WebP, or AVIF only)' }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const filename = `${session.tenantId}/menu/${timestamp}-${crypto.randomUUID()}.${ext}`;

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();
    await env.R2.put(filename, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Return R2 URL
    const url = `/r2/${filename}`;
    return json({ success: true, url });
  } catch (error) {
    console.error('Image upload error:', error);
    return json({ error: 'Upload failed' }, { status: 500 });
  }
}
