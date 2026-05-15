import type { APIRoute } from 'astro';
import { getSession, isAdminRole } from '../../../../../../../lib/session';
import { getFreshSupabaseAccessToken } from '../../../../../../../lib/supabase-session';
import { paFetchJson, planAdvisorApiBase } from '../../../../../../../lib/pa-api';

export const prerender = false;

/**
 * GET /api/pa/admin/ai-analysis/chat/jobs/:job_id
 * Proxies to PlanAdvisorAPI GET /admin/ai-analysis/chat/jobs/:jobId (async analysis poll).
 */
export const GET: APIRoute = async ({ params, cookies }) => {
  const session = getSession(cookies);
  if (!session || !isAdminRole(session.role)) {
    return new Response(JSON.stringify({ error: 'Forbidden', message: 'Admin sign-in required.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const jobId = String(params.job_id ?? '').trim();
  if (!jobId) {
    return new Response(JSON.stringify({ error: 'Missing job_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!planAdvisorApiBase()) {
    return new Response(
      JSON.stringify({ error: 'API not configured', message: 'API_BASE_URL is not set on this deployment.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const fresh = await getFreshSupabaseAccessToken(cookies);
  if (!fresh.ok) {
    return new Response(JSON.stringify({ error: 'Session expired', message: 'Please sign out and sign in again.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const result = await paFetchJson<Record<string, unknown>>(
    `/admin/ai-analysis/chat/jobs/${encodeURIComponent(jobId)}`,
    fresh.accessToken,
  );

  const body = result.ok ? result.data : result.error;
  const status = result.ok ? 200 : result.status > 0 ? result.status : 502;

  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
};
