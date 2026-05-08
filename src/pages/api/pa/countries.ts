import type { APIRoute } from 'astro';
import { getSession } from '../../../lib/session';
import { getFreshSupabaseAccessToken } from '../../../lib/supabase-session';
import { paFetchJson } from '../../../lib/pa-api';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const session = getSession(cookies);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const fresh = await getFreshSupabaseAccessToken(cookies);
  if (!fresh.ok) {
    return new Response(JSON.stringify({ error: 'Session expired' }), { status: 401 });
  }

  const result = await paFetchJson<Array<{ id: string; code: string; name: string }>>(
    '/countries',
    fresh.accessToken,
  );

  if (!result.ok) {
    return new Response(JSON.stringify(result.error), { status: result.status || 502 });
  }

  return new Response(JSON.stringify(result.data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
