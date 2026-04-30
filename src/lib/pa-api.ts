/** Plan Advisor Backend (Railway Express) — server-side only helpers. */

import type { Session } from './session';

export function planAdvisorApiBase(): string {
  return (import.meta.env.API_BASE_URL ?? '').trim().replace(/\/$/, '');
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
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(init?.headers as Record<string, string>),
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
