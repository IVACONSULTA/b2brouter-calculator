/**
 * BFF — POST /api/pa/admin/documents/copyright-check
 *
 * Forwards the file to PlanAdvisorAPI POST /admin/documents/copyright-check
 * (which extracts text and runs the copyright decision tree).
 *
 * The file is NOT stored — this is a pre-upload compliance scan only.
 *
 * Responses mirrored from the API:
 *   200 — { copyright_status: 'clear'|'restricted', reason, legal_basis,
 *            paraphrase_required, matched_pattern, checked_chars }
 *   451 — { error: 'copyright_restriction', copyright_status: 'blocked',
 *            reason, legal_basis, matched_pattern, action_required }
 *   400/401/403/5xx — forwarded as-is
 */

import type { APIRoute } from 'astro';
import { getSession, isAdminRole } from '../../../../../lib/session';
import { getFreshSupabaseAccessToken } from '../../../../../lib/supabase-session';
import { paApiAbsoluteUrl, planAdvisorApiKey } from '../../../../../lib/pa-api';

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

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json(400, { error: 'Invalid form data.' });
  }

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return json(400, { error: 'A non-empty file is required for copyright check.' });
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

  const apiUrl = paApiAbsoluteUrl('/admin/documents/copyright-check');
  if (!apiUrl) {
    return json(503, { error: 'API_BASE_URL is not configured.' });
  }

  const outbound = new FormData();
  outbound.append('file', file, file.name);

  const apiKey = planAdvisorApiKey();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${fresh.accessToken}`,
    ...(apiKey ? { 'X-API-Key': apiKey } : {}),
  };

  let apiRes: Response;
  try {
    apiRes = await fetch(apiUrl, { method: 'POST', headers, body: outbound });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error reaching PlanAdvisorAPI.';
    return json(502, { error: message });
  }

  const text = await apiRes.text();
  let data: unknown = null;
  if (text.length) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  // Mirror the status code from the API (200 clear/restricted, 451 blocked, etc.)
  return new Response(JSON.stringify(data), {
    status: apiRes.status,
    headers: { 'Content-Type': 'application/json' },
  });
};
