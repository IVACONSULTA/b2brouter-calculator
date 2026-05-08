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
    profile_slug?: string;
    calculation_profile_id?: string;
    country_id?: string;
    provider_id?: string;
  };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Invalid JSON body.' });
  }

  const profile_slug = String(body.profile_slug ?? '').trim();
  const calculation_profile_id = String(body.calculation_profile_id ?? '').trim();
  const country_id = String(body.country_id ?? '').trim();
  const provider_id = String(body.provider_id ?? '').trim();

  if (!profile_slug || !calculation_profile_id || !country_id || !provider_id) {
    return json(400, {
      error:
        'profile_slug, calculation_profile_id, country_id, and provider_id are required.',
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

  const result = await paPostJson<unknown>(
    '/admin/wizard/run-analysis',
    fresh.accessToken,
    {
      profile_slug,
      calculation_profile_id,
      country_id,
      provider_id,
    },
  );

  if (!result.ok) {
    return json(result.status || 502, result.error);
  }

  return json(201, result.data);
};
