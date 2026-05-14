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

/**
 * PATCH /api/pa/admin/rules/:id
 *
 * Proxies PATCH /api/admin/rules/:id on the Plan API.
 * Accepted fields: label, direction, obligation, operation_group,
 *                  pa_transactions_per_item, source_excerpt, confidence.
 */
export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  const session = getSession(cookies);
  if (!session || !isAdminRole(session.role)) {
    return json(403, { error: 'Forbidden', message: 'Admin sign-in required.' });
  }

  const { id } = params;
  if (!id) return json(400, { error: 'Rule ID is required.' });

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

  const result = await paFetchJson<unknown>(`/admin/rules/${encodeURIComponent(id)}`, fresh.accessToken, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!result.ok) {
    return json(result.status || 502, result.error);
  }

  return json(200, result.data);
};

/**
 * DELETE /api/pa/admin/rules/:id
 *
 * Proxies DELETE /api/admin/rules/:id on the Plan API.
 */
export const DELETE: APIRoute = async ({ params, cookies }) => {
  const session = getSession(cookies);
  if (!session || !isAdminRole(session.role)) {
    return json(403, { error: 'Forbidden', message: 'Admin sign-in required.' });
  }

  const { id } = params;
  if (!id) return json(400, { error: 'Rule ID is required.' });

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

  const result = await paFetchJson<unknown>(
    `/admin/rules/${encodeURIComponent(id)}`,
    fresh.accessToken,
    { method: 'DELETE' },
  );

  // 204 No Content comes back as ok with no body — treat both 200 and 204 as success.
  if (!result.ok && result.status !== 204) {
    return json(result.status || 502, result.error);
  }

  return new Response(null, { status: 204 });
};
