import type { AstroCookies } from 'astro';
import { canAccessUserPortal, isAdminRole, getSession } from './session';

/** Match `login.ts` / `supabase-session.ts` so the browser reliably drops the cookie. */
export function sessionCookieBaseOptions() {
  return {
    path: '/' as const,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: import.meta.env.PROD,
  };
}

/** Clear Plan Advisor session cookie (Supabase tokens live inside this JSON cookie only). */
export function clearSessionCookie(cookies: AstroCookies) {
  const base = sessionCookieBaseOptions();
  cookies.delete('session', { path: '/' });
  cookies.set('session', '', { ...base, maxAge: 0 });
}

/**
 * Where to send the user after sign-out.
 * - `admin` → admin login
 * - `customer` → customer portal login (internal / client / customer roles)
 * - else → home
 */
export function logoutRedirectPath(from: string | undefined | null): string {
  const f = (from ?? '').trim();
  if (f === 'admin') return '/admin/login';
  if (f === 'customer') return '/customer/login';
  return '/';
}

/** Infer `from` for logout when the URL/body omits it. */
export function inferLogoutFromSession(cookies: AstroCookies): string {
  const session = getSession(cookies);
  if (!session) return '';
  if (isAdminRole(session.role)) return 'admin';
  if (canAccessUserPortal(session.role)) return 'customer';
  return '';
}
