import type { APIRoute } from 'astro';
import { paFetchJson } from '../../../../lib/pa-api';
import { getFreshSupabaseAccessToken } from '../../../../lib/supabase-session';

export const prerender = false;

/** Same-origin proxy → `DELETE /api/scenarios/:id` on Plan Advisor API. */
export const DELETE: APIRoute = async ({ params, cookies }) => {
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
    return new Response(JSON.stringify({ error: 'Missing scenario id.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const result = await paFetchJson<unknown>(
    `/scenarios/${encodeURIComponent(id)}`,
    fresh.accessToken,
    { method: 'DELETE' },
  );

  if (!result.ok) {
    return new Response(JSON.stringify(result.error ?? { error: 'Request failed.' }), {
      status: result.status || 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(null, { status: 204 });
};
