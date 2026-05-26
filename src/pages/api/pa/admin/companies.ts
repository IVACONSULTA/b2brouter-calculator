import type { APIRoute } from 'astro';
import { paFetchJson } from '../../../../lib/pa-api';
import { getFreshSupabaseAccessToken } from '../../../../lib/supabase-session';

/**
 * GET /api/pa/admin/companies
 * Proxy to Plan Advisor API — keeps PA_PLAN_API_KEY server-side.
 */
export const GET: APIRoute = async ({ cookies }) => {
  const fresh = await getFreshSupabaseAccessToken(cookies);
  if (!fresh.ok || !fresh.accessToken) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const res = await paFetchJson('/admin/companies', fresh.accessToken);

  if (!res.ok) {
    return new Response(JSON.stringify(res.error), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(res.data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
