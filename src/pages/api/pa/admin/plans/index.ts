import type { APIRoute } from 'astro';
import { getSession, isAdminRole } from '../../../../../lib/session';
import { getFreshSupabaseAccessToken } from '../../../../../lib/supabase-session';
import { paFetchJson } from '../../../../../lib/pa-api';

export const prerender = false;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** GET /api/pa/admin/plans?profile_id=<uuid> — list plans for a profile. */
export const GET: APIRoute = async ({ url, cookies }) => {
  const session = getSession(cookies);
  if (!session || !isAdminRole(session.role)) {
    return json(403, { error: 'Forbidden', message: 'Admin sign-in required.' });
  }

  const profileId = url.searchParams.get('profile_id');
  if (!profileId) return json(400, { error: 'Missing profile_id query param.' });

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

  const result = await paFetchJson<unknown[]>(
    `/admin/plans?profile_id=${encodeURIComponent(profileId)}`,
    fresh.accessToken,
  );

  if (!result.ok) {
    return json(result.status || 502, result.error ?? { error: 'Upstream error.' });
  }

  return json(200, result.data);
};
