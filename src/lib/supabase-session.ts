import type { AstroCookies } from 'astro';
import { getSession, type Session } from './session';
import { getSupabaseAnon, isSupabaseConfigured } from './supabase';

function sessionCookieOptions() {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: import.meta.env.PROD,
    maxAge: 60 * 60 * 24,
  };
}

/** JWT `exp` (seconds since epoch), or null if not a JWT. */
function jwtExpSeconds(accessToken: string): number | null {
  try {
    const mid = accessToken.split('.')[1];
    if (!mid) return null;
    const json = Buffer.from(mid, 'base64url').toString('utf8');
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

export type FreshTokenResult =
  | { ok: true; accessToken: string }
  | { ok: false; code: 'no_session' | 'no_token' | 'expired' };

/**
 * Returns a Supabase access token that Plan Advisor can validate.
 * Refreshes using `supabaseRefreshToken` when the JWT is expired or near expiry, and updates the session cookie.
 */
export async function getFreshSupabaseAccessToken(cookies: AstroCookies): Promise<FreshTokenResult> {
  const session = getSession(cookies);
  if (!session) return { ok: false, code: 'no_session' };

  const access = session.supabaseAccessToken?.trim();
  if (!access) return { ok: false, code: 'no_token' };

  if (!isSupabaseConfigured()) {
    return { ok: true, accessToken: access };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const exp = jwtExpSeconds(access);
  const bufferSec = 120;
  const needsRefresh = exp != null ? exp <= nowSec + bufferSec : false;

  if (!needsRefresh) {
    return { ok: true, accessToken: access };
  }

  const refresh = session.supabaseRefreshToken?.trim();
  if (!refresh) {
    return { ok: false, code: 'expired' };
  }

  const supabase = getSupabaseAnon();
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refresh });

  if (error || !data.session) {
    return { ok: false, code: 'expired' };
  }

  const next: Session = {
    ...session,
    supabaseAccessToken: data.session.access_token,
    supabaseRefreshToken: data.session.refresh_token ?? refresh,
  };
  cookies.set('session', JSON.stringify(next), sessionCookieOptions());

  return { ok: true, accessToken: data.session.access_token };
}
