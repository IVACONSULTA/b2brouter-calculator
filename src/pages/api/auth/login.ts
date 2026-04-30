import type { APIRoute } from 'astro';
import { createSupabaseWithUserJwt, supabase } from '../../../lib/supabase';
import {
  canAccessUserPortal,
  isAdminRole,
  sessionRoleFromProfileOrMeta,
  type Session,
} from '../../../lib/session';

const IS_DUMMY_MODE =
  !import.meta.env.SUPABASE_URL ||
  import.meta.env.SUPABASE_URL === 'https://placeholder.supabase.co';

const DUMMY_USERS: Record<string, { name: string; role: Session['role'] }> = {
  'admin@b2brouter.com': { name: 'Admin User', role: 'admin' },
  'analyst@b2brouter.com': { name: 'Sofia Analyst', role: 'internal' },
  'client@acmecorp.com': { name: 'Carlos Ruiz', role: 'client' },
};

function loginErrorUrl(from: string, code: string): string {
  if (from === 'admin') return `/admin/login?error=${code}`;
  if (from === 'customer') return `/customer/login?error=${code}`;
  return `/login?error=${code}${from ? `&from=${from}` : ''}`;
}

function assertPortalMatchesRole(from: string, role: Session['role']): string | null {
  if (from === 'admin' && !isAdminRole(role)) {
    return loginErrorUrl('admin', 'wrong_portal');
  }
  if (from === 'customer' && !canAccessUserPortal(role)) {
    return loginErrorUrl('customer', 'wrong_portal');
  }
  return null;
}

function resolveRedirect(role: Session['role'], from: string): string {
  if (from === 'admin') return '/admin/dashboard';
  if (from === 'customer') return '/dashboard';
  return isAdminRole(role) ? '/admin/dashboard' : '/dashboard';
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const url = new URL(request.url);
  const from = url.searchParams.get('from') ?? '';

  const form = await request.formData();
  const email = form.get('email')?.toString().trim() ?? '';
  const password = form.get('password')?.toString() ?? '';

  if (!email || !password) {
    return redirect(loginErrorUrl(from, 'missing_fields'));
  }

  // ── Dev / Demo mode ───────────────────────────────────────────────────────
  if (IS_DUMMY_MODE) {
    const dummy = DUMMY_USERS[email];
    if (!dummy || password.length < 1) {
      return redirect(loginErrorUrl(from, 'invalid_credentials'));
    }

    const portalErr = assertPortalMatchesRole(from, dummy.role);
    if (portalErr) return redirect(portalErr);

    cookies.set(
      'session',
      JSON.stringify({
        role: dummy.role,
        email,
        name: dummy.name,
        loggedInAt: new Date().toISOString(),
      }),
      {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24,
      },
    );

    return redirect(resolveRedirect(dummy.role, from));
  }

  // ── Supabase: role from public.profiles (see DB triggers + migrations) ───
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session || !data.user) {
    return redirect(loginErrorUrl(from, 'invalid_credentials'));
  }

  const userMeta = data.user.user_metadata ?? {};
  const userSb = createSupabaseWithUserJwt(data.session.access_token);
  const { data: profile } = await userSb
    .from('profiles')
    .select('role, full_name')
    .eq('id', data.user.id)
    .maybeSingle();

  const role = sessionRoleFromProfileOrMeta(
    profile?.role as string | undefined,
    userMeta.role as string | undefined,
  );

  const portalErr = assertPortalMatchesRole(from, role);
  if (portalErr) {
    return redirect(portalErr);
  }

  const name =
    (profile?.full_name as string | undefined)?.trim() ||
    (userMeta.full_name as string | undefined) ||
    (userMeta.name as string | undefined) ||
    email.split('@')[0];

  cookies.set(
    'session',
    JSON.stringify({
      role,
      email: data.user.email ?? email,
      name,
      supabaseAccessToken: data.session.access_token,
      loggedInAt: new Date().toISOString(),
    }),
    {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: import.meta.env.PROD,
      maxAge: 60 * 60 * 24,
    },
  );

  return redirect(resolveRedirect(role, from));
};
