import type { APIRoute } from 'astro';
import { paFetchJson } from '../../../../../lib/pa-api';
import { getFreshSupabaseAccessToken } from '../../../../../lib/supabase-session';

export const prerender = false;

/** Same-origin proxy → `POST /api/scenarios/:id/generate-summary` on Plan Advisor API. */
export const POST: APIRoute = async ({ params, cookies }) => {
  const fresh = await getFreshSupabaseAccessToken(cookies);
  if (!fresh.ok) {
    const msg =
      fresh.code === 'no_session' || fresh.code === 'no_token'
        ? 'Not signed in with Supabase.'
        : 'Session expired. Please sign in again.';
    return new Response(JSON.stringify({ error: 'Unauthorized', message: msg, code: fresh.code }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const id = params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing scenario id.' }), { status: 400 });
  }

  const result = await paFetchJson<{ summary: string }>(
    `/scenarios/${encodeURIComponent(id)}/generate-summary`,
    fresh.accessToken,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
  );

  if (!result.ok) {
    return new Response(JSON.stringify(result.error), {
      status: result.status || 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(result.data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
