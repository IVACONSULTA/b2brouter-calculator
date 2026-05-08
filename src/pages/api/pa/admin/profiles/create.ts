import type { APIRoute } from 'astro';
import { getSession, isAdminRole } from '../../../../../lib/session';
import { getFreshSupabaseAccessToken } from '../../../../../lib/supabase-session';
import { paPostJson } from '../../../../../lib/pa-api';

export const prerender = false;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = getSession(cookies);
  if (!session || !isAdminRole(session.role)) {
    return json(403, { error: 'Forbidden', message: 'Admin sign-in required.' });
  }

  let body: {
    country_id?: string;
    provider_id?: string;
    version?: string;
    currency?: string;
    calculation_basis?: string;
    notes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Invalid JSON body.' });
  }

  const country_id = String(body.country_id ?? '').trim();
  const provider_id = String(body.provider_id ?? '').trim();
  const version = String(body.version ?? '').trim();
  const currency = String(body.currency ?? '').trim();

  if (!country_id || !provider_id || !version || !currency) {
    return json(400, {
      error: 'country_id, provider_id, version, and currency are required.',
    });
  }

  const fresh = await getFreshSupabaseAccessToken(cookies);
  if (!fresh.ok) {
    return json(401, {
      error: 'Unauthorized',
      message:
        fresh.code === 'no_session' || fresh.code === 'no_token'
          ? 'Not signed in with Supabase.'
          : 'Session expired. Please sign in again.',
    });
  }

  const result = await paPostJson<{ id: string }>(
    '/admin/profiles',
    fresh.accessToken,
    {
      country_id,
      provider_id,
      version,
      currency,
      calculation_basis: body.calculation_basis || 'PA transactions',
      notes: body.notes || undefined,
    },
  );

  if (!result.ok) {
    return json(result.status || 502, result.error);
  }

  return json(201, result.data);
};
