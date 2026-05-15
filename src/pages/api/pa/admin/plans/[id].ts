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

/** PATCH /api/pa/admin/plans/[id] — update a plan. */
export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  const session = getSession(cookies);
  if (!session || !isAdminRole(session.role)) {
    return json(403, { error: 'Forbidden', message: 'Admin sign-in required.' });
  }

  const { id } = params;
  if (!id) return json(400, { error: 'Missing plan id.' });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Invalid JSON body.' });
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

  const result = await paFetchJson<Record<string, unknown>>(
    `/admin/plans/${encodeURIComponent(id)}`,
    fresh.accessToken,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );

  if (!result.ok) {
    return json(result.status || 502, result.error ?? { error: 'Upstream error.' });
  }

  return json(200, result.data);
};

/** DELETE /api/pa/admin/plans/[id] — delete a plan. */
export const DELETE: APIRoute = async ({ params, cookies }) => {
  const session = getSession(cookies);
  if (!session || !isAdminRole(session.role)) {
    return json(403, { error: 'Forbidden', message: 'Admin sign-in required.' });
  }

  const { id } = params;
  if (!id) return json(400, { error: 'Missing plan id.' });

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

  const result = await paFetchJson<Record<string, unknown>>(
    `/admin/plans/${encodeURIComponent(id)}`,
    fresh.accessToken,
    { method: 'DELETE' },
  );

  if (!result.ok) {
    return json(result.status || 502, result.error ?? { error: 'Upstream error.' });
  }

  return json(200, result.data);
};
