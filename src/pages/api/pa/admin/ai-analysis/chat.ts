import type { APIRoute } from 'astro';
import { getSession, isAdminRole } from '../../../../../lib/session';
import { getFreshSupabaseAccessToken } from '../../../../../lib/supabase-session';
import { paFetchJson } from '../../../../../lib/pa-api';

export const prerender = false;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * POST /api/pa/admin/ai-analysis/chat
 * Proxies to PlanAdvisorAPI POST /admin/ai-analysis/chat.
 * PlanAdvisorAPI handles document loading, text extraction, and the AgenteDocumental call.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const session = getSession(cookies);
  if (!session || !isAdminRole(session.role)) {
    return json(403, { error: 'Forbidden', message: 'Admin sign-in required.' });
  }

  let body: { message?: string; profileId?: string; countryName?: string; providerName?: string };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Invalid JSON body.' });
  }

  const message = String(body.message ?? '').trim();
  const profileId = String(body.profileId ?? '').trim();
  if (!message) {
    return json(400, { error: 'message is required.' });
  }
  if (!profileId) {
    return json(400, { error: 'profileId is required.' });
  }

  const fresh = await getFreshSupabaseAccessToken(cookies);
  if (!fresh.ok) {
    return json(401, {
      error: 'Session expired',
      message: 'Please sign out and sign in again.',
    });
  }

  const result = await paFetchJson<{
    assistant?: string;
    rules?: unknown[];
    raw_output?: string;
    documents_used?: string[];
    error?: string;
    message?: string;
    demo?: boolean;
  }>('/admin/ai-analysis/chat', fresh.accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      profileId,
      countryName: body.countryName ?? undefined,
      providerName: body.providerName ?? undefined,
    }),
  });

  if (!result.ok) {
    return json(result.status, result.data ?? { error: 'API request failed' });
  }

  return json(200, result.data);
};
