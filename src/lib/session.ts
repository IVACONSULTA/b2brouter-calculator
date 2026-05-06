import type { AstroCookies } from 'astro';

export interface Session {
  role: 'admin' | 'internal' | 'client' | 'customer';
  email: string;
  name: string;
  /** Present after real Supabase login. Used to authenticate backend API calls. */
  supabaseAccessToken?: string;
  /** Used server-side to obtain a new access token before JWT expiry (~1h). */
  supabaseRefreshToken?: string;
  loggedInAt: string;
}

/** Map DB `public.profiles.role` (or auth metadata) into the session role union. */
export function sessionRoleFromProfileOrMeta(
  profileRole: string | null | undefined,
  metaRole: string | null | undefined,
): Session['role'] {
  const raw = (profileRole ?? metaRole ?? 'client').toString().toLowerCase().trim();
  if (raw === 'admin') return 'admin';
  if (raw === 'internal') return 'internal';
  if (raw === 'customer') return 'customer';
  return 'client';
}

/** Role in session matches `public.profiles.role` after login (source of truth at sign-in). */
export function isAdminRole(role: Session['role']): boolean {
  return role === 'admin';
}

/** Internal + client roles use the Customer Portal (calculator, scenarios, etc.). */
export function canAccessUserPortal(role: Session['role']): boolean {
  return role === 'internal' || role === 'client' || role === 'customer';
}

export function getSession(cookies: AstroCookies): Session | null {
  const raw = cookies.get('session')?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}
