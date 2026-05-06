/** Plan Advisor Backend (Railway Express) — server-side only helpers. */

import type { Session } from './session';

/**
 * Base URL for Plan Advisor (no trailing slash).
 * `0.0.0.0` is only valid for **binding** a server; outbound HTTP clients must use loopback.
 */
export function planAdvisorApiBase(): string {
  const base = (import.meta.env.API_BASE_URL ?? '').trim().replace(/\/$/, '');
  if (!base) return '';
  // `0.0.0.0` is valid for binding a server, not as an outbound HTTP target from Node/fetch.
  return base.replace(/\b0\.0\.0\.0\b/g, '127.0.0.1');
}

/** Shared secret for Plan Advisor API (Railway `PA_PLAN_API_KEY`). Sent as `X-API-Key` when set. */
export function planAdvisorApiKey(): string {
  return (import.meta.env.PA_PLAN_API_KEY ?? '').trim();
}

function headersInitToRecord(init?: HeadersInit): Record<string, string> {
  if (!init) return {};
  if (init instanceof Headers) {
    const o: Record<string, string> = {};
    init.forEach((v, k) => {
      o[k] = v;
    });
    return o;
  }
  if (Array.isArray(init)) {
    return Object.fromEntries(init);
  }
  return { ...init };
}

export function paAuthHeaders(token: string, extra?: HeadersInit): Record<string, string> {
  const key = planAdvisorApiKey();
  return {
    ...headersInitToRecord(extra),
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    ...(key ? { 'X-API-Key': key } : {}),
  };
}

/** True when we can attempt authenticated backend calls after Supabase login. */
export function canUsePlanAdvisorApi(session: Session | null): boolean {
  const base = planAdvisorApiBase();
  const token = session?.supabaseAccessToken?.trim();
  return base.length > 0 && !!token;
}

/** Build URL: accepts path like `/me` or `me`; always targets `/api/...`. */
export function paApiAbsoluteUrl(apiPath: string): string | null {
  const base = planAdvisorApiBase();
  if (!base) return null;
  const suffix = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  if (/\/api$/i.test(base)) {
    return `${base}${suffix}`;
  }
  return `${base}/api${suffix}`;
}

/** POST target for AI summary — same rules as `paApiAbsoluteUrl`. */
export function paScenarioGenerateSummaryUrl(scenarioId: string): string | null {
  return paApiAbsoluteUrl(`/scenarios/${encodeURIComponent(scenarioId)}/generate-summary`);
}

/**
 * Same-origin Astro BFF for summary generation. Browser POSTs here; the route handler uses
 * `paFetchJson('/scenarios/:id/generate-summary', …)` — same Plan Advisor path as
 * `paScenarioGenerateSummaryUrl`, with cookies → Bearer handled server-side.
 */
export function paScenarioGenerateSummaryProxyPath(scenarioId: string): string {
  return `/api/pa/scenarios/${encodeURIComponent(scenarioId)}/generate-summary`;
}

export type PaOk<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: unknown };

export async function paFetchJson<T>(
  apiPath: string,
  token: string,
  init?: RequestInit,
): Promise<PaOk<T>> {
  const url = paApiAbsoluteUrl(apiPath);
  if (!url) {
    return { ok: false, status: 0, error: { message: 'API_BASE_URL is not set.' } };
  }

  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        ...paAuthHeaders(token, init?.headers),
      },
    });

    const text = await res.text();
    let data: unknown = null;
    if (text.length) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }

    if (!res.ok) {
      return { ok: false, status: res.status, error: data };
    }

    return { ok: true, status: res.status, data: data as T };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      error: e instanceof Error ? { message: e.message } : e,
    };
  }
}

/** Multipart POST to Plan Advisor (e.g. document upload). Do not set Content-Type — boundary is set automatically. */
export async function paPostFormData(
  apiPath: string,
  token: string,
  form: FormData,
): Promise<PaOk<unknown>> {
  const url = paApiAbsoluteUrl(apiPath);
  if (!url) {
    return { ok: false, status: 0, error: { message: 'API_BASE_URL is not set.' } };
  }

  const key = planAdvisorApiKey();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(key ? { 'X-API-Key': key } : {}),
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: form,
    });

    const text = await res.text();
    let data: unknown = null;
    if (text.length) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }

    if (!res.ok) {
      return { ok: false, status: res.status, error: data };
    }

    return { ok: true, status: res.status, data };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      error: e instanceof Error ? { message: e.message } : e,
    };
  }
}
