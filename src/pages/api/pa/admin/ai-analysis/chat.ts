import type { APIRoute } from 'astro';
import { getSession, isAdminRole } from '../../../../../lib/session';
import { listLocalProfileDocumentAbsolutePaths, safeProfileSlug } from '../../../../../lib/admin-ai-analysis-paths';
import { parseCrewAnalysisOutput } from '../../../../../lib/pa-crew-response-parse';
import { getFreshSupabaseAccessToken } from '../../../../../lib/supabase-session';
import { paFetchJson, planAdvisorApiBase } from '../../../../../lib/pa-api';

export const prerender = false;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** CrewAI service: independent app AgenteDocumental (`POST /analyze`). Set PLAN_ADVISOR_CREW_URL. */
function crewBaseUrl(): string {
  return (import.meta.env.PLAN_ADVISOR_CREW_URL ?? '').trim().replace(/\/$/, '');
}

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

  const base = crewBaseUrl();
  if (!base) {
    return json(503, {
      error: 'Crew service unavailable',
      message: 'Set PLAN_ADVISOR_CREW_URL (e.g. http://127.0.0.1:8788) and run the Python crew server.',
      demo: true,
    });
  }

  let { rootDir, paths } = listLocalProfileDocumentAbsolutePaths(profileId);

  if (paths.length === 0 && planAdvisorApiBase()) {
    const fresh = await getFreshSupabaseAccessToken(cookies);
    if (fresh.ok) {
      const stagingRoot = (import.meta.env.PLAN_ADVISOR_STAGING_DOCUMENT_ROOT ?? '/data/documents')
        .trim()
        .replace(/\/$/, '');
      const slug = safeProfileSlug(profileId);
      const list = await paFetchJson<Array<{ filename: string }>>(
        `/admin/documents/staging?profile_slug=${encodeURIComponent(profileId)}`,
        fresh.accessToken,
      );

      if (list.ok && Array.isArray(list.data) && list.data.length > 0) {
        rootDir = `${stagingRoot}/staging__${slug}`;
        paths = list.data.map((row) => `${rootDir}/${row.filename}`);
      }
    }
  }

  if (paths.length === 0) {
    return json(400, {
      error: 'No documents',
      message: `No files under docs/uploads/${safeProfileSlug(profileId)} for local crew, and no Railway staged documents for this profile (or crew cannot read PLAN_ADVISOR_STAGING_DOCUMENT_ROOT).`,
    });
  }

  const crewRes = await fetch(`${base}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      document_paths: paths,
      allowed_roots: [rootDir],
      country_name: body.countryName ?? undefined,
      provider_name: body.providerName ?? undefined,
      profile_id: profileId,
    }),
  });

  const rawText = await crewRes.text();
  let payload: { output?: string; detail?: unknown };
  try {
    payload = JSON.parse(rawText) as { output?: string; detail?: unknown };
  } catch {
    return json(502, {
      error: 'Crew response not JSON',
      message: rawText.slice(0, 500),
    });
  }

  if (!crewRes.ok) {
    return json(crewRes.status, {
      error: 'Crew error',
      message: typeof payload.detail === 'string' ? payload.detail : payload,
    });
  }

  const output = String(payload.output ?? '');
  const { assistant, rules } = parseCrewAnalysisOutput(output);

  return json(200, {
    assistant,
    rules,
    raw_output: output,
    documents_used: paths.map((p) => p.split('/').pop() ?? p),
  });
};
