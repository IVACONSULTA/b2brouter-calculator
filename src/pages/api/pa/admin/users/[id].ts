import type { APIRoute } from 'astro';
import { paFetchJson } from '../../../../../lib/pa-api';
import { getFreshSupabaseAccessToken } from '../../../../../lib/supabase-session';

/**
 * GET /api/pa/admin/users/:id
 * Proxy to Plan Advisor API — keeps PA_PLAN_API_KEY server-side.
 */
export const GET: APIRoute = async ({ params, cookies }) => {
  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing user ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const fresh = await getFreshSupabaseAccessToken(cookies);
  if (!fresh.ok || !fresh.accessToken) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const res = await paFetchJson(
    `/admin/users/${encodeURIComponent(id)}`,
    fresh.accessToken,
  );

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

/**
 * PATCH /api/pa/admin/users/:id
 * Proxy to Plan Advisor API — keeps PA_PLAN_API_KEY server-side.
 */
export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing user ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const fresh = await getFreshSupabaseAccessToken(cookies);
  if (!fresh.ok || !fresh.accessToken) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const res = await paFetchJson(
    `/admin/users/${encodeURIComponent(id)}`,
    fresh.accessToken,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );

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
