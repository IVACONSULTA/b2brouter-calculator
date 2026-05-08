import type { APIRoute } from 'astro';
import { getSession, isAdminRole } from '../../../../../lib/session';
import { getFreshSupabaseAccessToken } from '../../../../../lib/supabase-session';
import { paPostJson } from '../../../../../lib/pa-api';

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

  let body: { profile_id?: string; profile_slug?: string };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Invalid JSON body.' });
  }

  const profile_id = String(body.profile_id ?? '').trim();
  const profile_slug = String(body.profile_slug ?? '').trim();
  if (!profile_id) {
    return json(400, { error: 'profile_id is required.' });
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

  const result = await paPostJson<unknown>(
    '/admin/wizard/approve-analysis',
    fresh.accessToken,
    { profile_id, profile_slug: profile_slug || undefined },
  );

  if (!result.ok) {
    return json(result.status || 502, result.error);
  }

  return json(200, result.data);
};
