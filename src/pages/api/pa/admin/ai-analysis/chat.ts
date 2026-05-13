import type { APIRoute } from 'astro';
import { getSession, isAdminRole } from '../../../../../lib/session';
import { getFreshSupabaseAccessToken } from '../../../../../lib/supabase-session';
import { paPostJson, planAdvisorApiBase } from '../../../../../lib/pa-api';

export const prerender = false;

function json(status: number, body: unknown) {
  let payload: string;
  try {
    payload = JSON.stringify(body);
  } catch (ser) {
    const msg = ser instanceof Error ? ser.message : String(ser);
    console.error('[ai-analysis/chat BFF] JSON.stringify failed:', msg);
    payload = JSON.stringify({
      error: 'Response serialization failed',
      message: msg,
    });
    status = 500;
  }
  return new Response(payload, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * POST /api/pa/admin/ai-analysis/chat
 * Proxies to PlanAdvisorAPI POST /admin/ai-analysis/chat.
 * PlanAdvisorAPI handles document loading, text extraction, and the AgenteDocumental call.
 *
 * **Timeouts:** This handler runs on Netlify as part of the Astro `ssr` serverless function.
 * Netlify enforces a max wall-clock time per invocation (default ~60s unless raised in
 * `netlify.toml` → `[functions.ssr]`). Crew-based analysis often runs minutes longer; if
 * the limit is too low the client sees 504 while Railway/API logs still show work in progress.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const session = getSession(cookies);
    if (!session || !isAdminRole(session.role)) {
      return json(403, { error: 'Forbidden', message: 'Admin sign-in required.' });
    }

    let body: {
      message?: string;
      profileId?: string;
      countryName?: string;
      providerName?: string;
    };
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

    const base = planAdvisorApiBase();
    if (!base) {
      return json(503, {
        error: 'API not configured',
        message: 'API_BASE_URL is not set on this deployment.',
        demo: true,
      });
    }

    const fresh = await getFreshSupabaseAccessToken(cookies);
    if (!fresh.ok) {
      return json(401, {
        error: 'Session expired',
        message: 'Please sign out and sign in again.',
      });
    }

    const result = await paPostJson<{
      assistant?: string;
      rules?: unknown[];
      raw_output?: string;
      documents_used?: string[];
      error?: string;
      message?: string;
      demo?: boolean;
    }>('/admin/ai-analysis/chat', fresh.accessToken, {
      message,
      profileId,
      countryName: body.countryName ?? undefined,
      providerName: body.providerName ?? undefined,
    });

    if (!result.ok) {
      const status = result.status > 0 ? result.status : 502;
      const errorBody = result.error ?? { error: 'API request failed' };
      console.error('[ai-analysis/chat BFF] API error:', status, errorBody);
      return json(status, errorBody);
    }

    return json(200, result.data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    console.error('[ai-analysis/chat BFF] unhandled:', msg, stack);
    return json(500, {
      error: 'BFF internal error',
      message: msg || 'Unknown error',
    });
  }
};
