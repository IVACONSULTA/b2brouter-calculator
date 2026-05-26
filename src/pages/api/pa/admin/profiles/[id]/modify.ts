import type { APIRoute } from 'astro';
import { getSession, isAdminRole } from '../../../../../../lib/session';
import { getFreshSupabaseAccessToken } from '../../../../../../lib/supabase-session';
import { paPostJson } from '../../../../../../lib/pa-api';

export const prerender = false;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * POST /api/pa/admin/profiles/:id/modify
 * Reopens an active profile for modification (status → pending_approval).
 */
export const POST: APIRoute = async ({ params, cookies }) => {
  const session = getSession(cookies);
  if (!session || !isAdminRole(session.role)) {
    return json(403, { error: 'Forbidden', message: 'Admin sign-in required.' });
  }

  const { id } = params;
  if (!id) {
    return json(400, { error: 'Missing profile ID' });
  }

  const fresh = await getFreshSupabaseAccessToken(cookies);
  if (!fresh.ok || !fresh.accessToken) {
    return json(401, {
      error: 'Unauthorized',
      message:
        fresh.code === 'no_session' || fresh.code === 'no_token'
          ? 'Not signed in with Supabase.'
          : 'Session expired. Please sign in again.',
    });
  }

  const result = await paPostJson<Record<string, unknown>>(
    `/admin/profiles/${encodeURIComponent(id)}/modify`,
    fresh.accessToken,
    {},
  );

  if (!result.ok) {
    return json(result.status || 502, result.error);
  }

  return json(200, result.data);
};
