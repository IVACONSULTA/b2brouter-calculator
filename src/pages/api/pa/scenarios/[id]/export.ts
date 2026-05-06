import type { APIRoute } from 'astro';
import { paApiAbsoluteUrl, paAuthHeaders } from '../../../../../lib/pa-api';
import { getFreshSupabaseAccessToken } from '../../../../../lib/supabase-session';

export const prerender = false;

/**
 * Same-origin proxy → `GET /api/scenarios/:id/export` on Plan Advisor API.
 * Streams the JSON attachment (including Content-Disposition).
 */
export const GET: APIRoute = async ({ params, cookies, url }) => {
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

  const format = url.searchParams.get('format') || 'json';
  const basePath = `/scenarios/${encodeURIComponent(id)}/export?format=${encodeURIComponent(format)}`;
  const target = paApiAbsoluteUrl(basePath);
  if (!target) {
    return new Response(JSON.stringify({ error: 'API_BASE_URL is not set.' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: 'GET',
      headers: paAuthHeaders(fresh.accessToken),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Upstream fetch failed.';
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await upstream.arrayBuffer();
  const ct = upstream.headers.get('Content-Type') || 'application/json';
  const cd = upstream.headers.get('Content-Disposition');

  if (!upstream.ok) {
    return new Response(body, {
      status: upstream.status,
      headers: { 'Content-Type': ct },
    });
  }

  const headers: Record<string, string> = { 'Content-Type': ct };
  if (cd) headers['Content-Disposition'] = cd;

  return new Response(body, { status: 200, headers });
};
