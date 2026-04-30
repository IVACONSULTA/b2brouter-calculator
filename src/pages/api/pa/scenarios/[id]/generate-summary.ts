import type { APIRoute } from 'astro';
import { getSession } from '../../../../../lib/session';
import { paFetchJson } from '../../../../../lib/pa-api';

export const prerender = false;

/** Same-origin proxy → `POST /api/scenarios/:id/generate-summary` on Plan Advisor API. */
export const POST: APIRoute = async ({ params, cookies }) => {
  const session = getSession(cookies);
  const token = session?.supabaseAccessToken;
  if (!token) {
    return new Response(JSON.stringify({ error: 'Not signed in with Supabase.', code: 'no_token' }), {
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
    token,
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
