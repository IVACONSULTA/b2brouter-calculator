import type { APIRoute } from 'astro';
import { paFetchJson } from '../../../lib/pa-api';
import { getFreshSupabaseAccessToken } from '../../../lib/supabase-session';

export const prerender = false;

/** Same-origin proxy: reads httpOnly session and calls Plan Advisor `POST /api/calculator/calculate`. */
export const POST: APIRoute = async ({ request, cookies }) => {
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const result = await paFetchJson<Record<string, unknown>>('/calculator/calculate', fresh.accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

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
