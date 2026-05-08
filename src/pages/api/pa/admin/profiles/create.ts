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
    country_code?: string;
    country_name?: string;
    provider_name?: string;
    provider_type?: string;
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

  console.log('[BFF /profiles/create] Received:', {
    has_country_id: Boolean(body.country_id),
    has_provider_id: Boolean(body.provider_id),
    has_country_code: Boolean(body.country_code),
    has_country_name: Boolean(body.country_name),
    has_provider_name: Boolean(body.provider_name),
    version: body.version,
    currency: body.currency,
  });

  const country_id = String(body.country_id ?? '').trim();
  const provider_id = String(body.provider_id ?? '').trim();
  const country_code = String(body.country_code ?? '').trim();
  const country_name = String(body.country_name ?? '').trim();
  const provider_name = String(body.provider_name ?? '').trim();
  const version = String(body.version ?? '').trim();
  const currency = String(body.currency ?? '').trim();

  // Either UUIDs or code/name required
  const hasUUIDs = country_id && provider_id;
  const hasCodeName = country_code && country_name && provider_name;

  console.log('[BFF /profiles/create] Validation:', { hasUUIDs, hasCodeName });

  if (!hasUUIDs && !hasCodeName) {
    return json(400, {
      error: 'Must provide either (country_id, provider_id) or (country_code, country_name, provider_name).',
      debug: { country_code, country_name, provider_name },
    });
  }

  if (!version || !currency) {
    return json(400, {
      error: 'version and currency are required.',
      debug: { version, currency },
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

  // Try with UUIDs first, fallback to code/name for wizard
  const profilePayload: Record<string, unknown> = {
    version,
    currency,
    calculation_basis: body.calculation_basis || 'PA transactions',
    notes: body.notes || undefined,
  };

  if (country_id && provider_id) {
    profilePayload.country_id = country_id;
    profilePayload.provider_id = provider_id;
  } else {
    // Wizard mode: send code/name for auto-creation
    profilePayload.country_code = body.country_code || undefined;
    profilePayload.country_name = body.country_name || undefined;
    profilePayload.provider_name = body.provider_name || undefined;
    profilePayload.provider_type = body.provider_type || 'PA';
  }

  const result = await paPostJson<{ id: string; country_id: string; provider_id: string }>(
    '/admin/profiles',
    fresh.accessToken,
    profilePayload,
  );

  if (!result.ok) {
    return json(result.status || 502, result.error);
  }

  return json(201, result.data);
};
