/** Server-side auth login debug — mirrors logs to a browser-readable cookie. */

import type { AstroCookies } from 'astro';

export const AUTH_DEBUG_COOKIE = 'pa_auth_debug';

export type AuthDebugLevel = 'log' | 'warn' | 'error';

export type AuthDebugLine = {
  level: AuthDebugLevel;
  msg: string;
  data?: Record<string, unknown>;
};

export type AuthDebugPayload = {
  ts: string;
  outcome: string;
  lines: AuthDebugLine[];
};

function envFlag(name: string): boolean {
  const v = (import.meta.env[name] ?? '').toString().trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/** Enabled via `?debug_auth=1`, form field `debug_auth=1`, or Netlify `PUBLIC_AUTH_DEBUG=1`. */
export function isAuthLoginDebugEnabled(
  requestUrl: URL,
  form?: FormData,
): boolean {
  if (envFlag('PUBLIC_AUTH_DEBUG')) return true;
  if (requestUrl.searchParams.get('debug_auth') === '1') return true;
  if (form?.get('debug_auth')?.toString() === '1') return true;
  return false;
}

/** Redact secrets before writing to the browser cookie. */
export function sanitizeAuthDebugData(
  data: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!data) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const k = key.toLowerCase();
    if (k.includes('password') || k.includes('token') || k.includes('secret')) {
      if (typeof value === 'string' && value.length > 8) {
        out[key] = `${value.slice(0, 4)}…${value.slice(-4)} (${value.length} chars)`;
      } else {
        out[key] = '[redacted]';
      }
    } else {
      out[key] = value;
    }
  }
  return out;
}

export class AuthDebugLog {
  private readonly lines: AuthDebugLine[] = [];

  add(level: AuthDebugLevel, msg: string, data?: Record<string, unknown>): void {
    const entry: AuthDebugLine = { level, msg };
    const safe = sanitizeAuthDebugData(data);
    if (safe && Object.keys(safe).length > 0) entry.data = safe;
    this.lines.push(entry);
    const prefix = `[api/auth/login] ${msg}`;
    if (level === 'error') console.error(prefix, safe ?? '');
    else if (level === 'warn') console.warn(prefix, safe ?? '');
    else console.log(prefix, safe ?? '');
  }

  finish(outcome: string): AuthDebugPayload {
    return { ts: new Date().toISOString(), outcome, lines: this.lines.slice(-40) };
  }
}

export function setAuthDebugCookie(
  cookies: AstroCookies,
  payload: AuthDebugPayload,
): void {
  try {
    const json = JSON.stringify(payload);
    if (json.length > 3500) {
      payload.lines = payload.lines.slice(-15);
      payload.lines.unshift({
        level: 'warn',
        msg: 'Log truncated (cookie size limit)',
      });
    }
    cookies.set(AUTH_DEBUG_COOKIE, JSON.stringify(payload), {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      secure: import.meta.env.PROD,
      maxAge: 120,
    });
  } catch (e) {
    console.error('[api/auth/login] failed to set auth debug cookie', e);
  }
}
