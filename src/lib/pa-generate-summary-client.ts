/**
 * Browser-side POST to `src/pages/api/pa/scenarios/[id]/generate-summary.ts`, which
 * runs `paFetchJson('/scenarios/:id/generate-summary', …)` on the server.
 * Do not use `paFetchJson` here — it targets Plan Advisor with secrets.
 * Do not use `API_BASE_URL` in the browser — use this same-origin BFF path only.
 */
export function scenarioIdFromScenariosPath(pathname: string): string | null {
  const m = /\/scenarios\/([^/]+)\/?$/.exec(pathname);
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

/**
 * Absolute URL for `fetch` (cookies are same-origin to the Astro app).
 * Optional env (first match): `PUBLIC_PA_SITE_ORIGIN`, `PUBLIC_SITE_URL` — no trailing slash.
 * Otherwise uses `window.location.origin` on the client. Falls back to a root-relative path.
 */
export function paScenarioSummaryBffUrl(scenarioId: string): string {
  const id = scenarioId.trim();
  if (!id) return '';
  const path = `/api/pa/scenarios/${encodeURIComponent(id)}/generate-summary`;
  const envBase =
    (import.meta.env.PUBLIC_PA_SITE_ORIGIN as string | undefined)?.trim().replace(/\/$/, '') ||
    (import.meta.env.PUBLIC_SITE_URL as string | undefined)?.trim().replace(/\/$/, '') ||
    '';
  if (typeof window !== 'undefined') {
    const origin = envBase || window.location.origin;
    return `${origin}${path}`;
  }
  return envBase ? `${envBase}${path}` : path;
}

export async function paFetchJsonGenerateSummaryPost(summaryEndpointUrl: string): Promise<Response> {
  const url = summaryEndpointUrl.trim();
  if (!url) {
    return Promise.reject(new Error('Missing summary endpoint URL.'));
  }
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: '{}',
    credentials: 'same-origin',
  });
}
