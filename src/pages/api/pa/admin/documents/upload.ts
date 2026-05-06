import type { APIRoute } from 'astro';
import { getSession, isAdminRole } from '../../../../../lib/session';
import { getFreshSupabaseAccessToken } from '../../../../../lib/supabase-session';
import { paPostFormData } from '../../../../../lib/pa-api';
import { saveLocalDevUpload, useLocalDocumentStorage } from '../../../../../lib/admin-documents-local';

export const prerender = false;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = getSession(cookies);
  if (!session || !isAdminRole(session.role)) {
    return json(403, { error: 'Forbidden', message: 'Admin sign-in required.' });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json(400, { error: 'Invalid form data.' });
  }

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return json(400, { error: 'A non-empty file is required.' });
  }

  const document_type = String(form.get('document_type') ?? '').trim();
  const descriptionRaw = form.get('description');
  const description =
    typeof descriptionRaw === 'string' && descriptionRaw.trim() ? descriptionRaw.trim() : null;
  const profile_slug = String(form.get('profile_slug') ?? '').trim();

  if (!document_type) {
    return json(400, { error: 'document_type is required.' });
  }

  const maxBytes = 50 * 1024 * 1024;
  if (file.size > maxBytes) {
    return json(400, { error: 'File too large (max 50 MB).' });
  }

  if (useLocalDocumentStorage()) {
    if (!profile_slug) {
      return json(400, { error: 'profile_slug is required for local document storage.' });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const item = saveLocalDevUpload(profile_slug, file.name, buf, document_type, description);
    return json(201, {
      id: item.id,
      filename: item.filename,
      document_type: item.document_type,
      description: item.description,
      copyright_status: item.copyright_status,
      created_at: item.created_at,
      local: true,
    });
  }

  const fresh = await getFreshSupabaseAccessToken(cookies);
  if (!fresh.ok) {
    return json(401, {
      error: 'Unauthorized',
      message:
        fresh.code === 'no_session' || fresh.code === 'no_token'
          ? 'Not signed in with Supabase.'
          : 'Session expired. Please sign in again.',
    });
  }

  const country_id = String(form.get('country_id') ?? '').trim();
  const provider_id = String(form.get('provider_id') ?? '').trim();
  const profile_id = String(form.get('profile_id') ?? '').trim();

  if (!country_id || !provider_id || !profile_id) {
    return json(400, {
      error:
        'country_id, provider_id, and profile_id are required. Ensure this profile exists in Plan Advisor (same country, provider, and version).',
    });
  }

  const outbound = new FormData();
  outbound.append('file', file, file.name);
  outbound.append('country_id', country_id);
  outbound.append('provider_id', provider_id);
  outbound.append('profile_id', profile_id);
  outbound.append('document_type', document_type);
  if (description) outbound.append('description', description);

  const result = await paPostFormData('/admin/documents/upload', fresh.accessToken, outbound);

  if (!result.ok) {
    return json(result.status || 502, result.error);
  }

  return json(201, result.data);
};
