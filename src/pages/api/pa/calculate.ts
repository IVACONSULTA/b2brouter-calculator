import type { APIRoute } from 'astro';
import { getSession } from '../../../lib/session';
import { paFetchJson } from '../../../lib/pa-api';

export const prerender = false;

/** Same-origin proxy: reads httpOnly session and calls Plan Advisor `POST /api/calculator/calculate`. */
export const POST: APIRoute = async ({ request, cookies }) => {
  const session = getSession(cookies);
  const token = session?.supabaseAccessToken;
  if (!token) {
    return new Response(JSON.stringify({ error: 'Not signed in with Supabase.', code: 'no_token' }), {
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

  const result = await paFetchJson<Record<string, unknown>>('/calculator/calculate', token, {
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
