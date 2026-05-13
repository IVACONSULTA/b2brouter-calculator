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
 * Starts async analysis on PlanAdvisorAPI (`X-Async-Analysis: 1`) and returns **202** with `job_id`.
 * The browser polls GET `/api/pa/admin/ai-analysis/chat/jobs/:job_id` (short requests) until completion.
 * This avoids Netlify (and other proxies) closing a single long idle HTTP connection while Crew runs.
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

    const start = await paPostJson<{
      job_id?: string;
      poll_after_ms?: number;
      message?: string;
      error?: string;
    }>(
      '/admin/ai-analysis/chat',
      fresh.accessToken,
      {
        message,
        profileId,
        countryName: body.countryName ?? undefined,
        providerName: body.providerName ?? undefined,
      },
      { 'X-Async-Analysis': '1' },
    );

    if (!start.ok) {
      const status = start.status > 0 ? start.status : 502;
      const errorBody = start.error ?? { error: 'API request failed' };
      console.error('[ai-analysis/chat BFF] API start error:', status, errorBody);
      return json(status, errorBody);
    }

    if (start.status === 202 && start.data?.job_id) {
      return json(202, {
        job_id: start.data.job_id,
        poll_after_ms: start.data.poll_after_ms ?? 1500,
        message:
          start.data.message ??
          'Poll GET /api/pa/admin/ai-analysis/chat/jobs/<job_id> until status is completed.',
      });
    }

    // Fallback: older API without async — treat body as final result (200).
    if (start.status === 200 && typeof (start.data as { assistant?: string }).assistant === 'string') {
      return json(200, start.data);
    }

    console.error('[ai-analysis/chat BFF] unexpected API response:', start.status, start.data);
    return json(502, { error: 'Unexpected response from analysis API', status: start.status });
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
