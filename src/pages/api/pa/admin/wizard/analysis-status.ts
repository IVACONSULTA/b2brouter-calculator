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
 * GET /api/pa/admin/wizard/analysis-status?analysis_id=…
 *
 * Polls the Plan API for the current status of an async document analysis
 * kicked off via POST /api/pa/admin/wizard/run-analysis. The Plan API endpoint
 * is fast (single DB read), so this route stays well under any function timeout.
 */
export const GET: APIRoute = async ({ url, cookies }) => {
  const session = getSession(cookies);
  if (!session || !isAdminRole(session.role)) {
    return json(403, { error: 'Forbidden', message: 'Admin sign-in required.' });
  }

  const analysis_id = (url.searchParams.get('analysis_id') ?? '').trim();
  if (!analysis_id) {
    return json(400, { error: 'analysis_id query param is required.' });
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

  const result = await paFetchJson<unknown>(
    `/admin/wizard/analysis-status?analysis_id=${encodeURIComponent(analysis_id)}`,
    fresh.accessToken,
  );

  if (!result.ok) {
    return json(result.status || 502, result.error);
  }

  return json(200, result.data);
};
