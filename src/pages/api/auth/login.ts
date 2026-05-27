import type { APIRoute } from 'astro';
import {
  getSupabaseAnon,
  isDemoAuthMode,
  isSupabaseConfigured,
} from '../../../lib/supabase';
import {
  canAccessUserPortal,
  isAdminRole,
  sessionRoleFromProfileOrMeta,
  type Session,
} from '../../../lib/session';
import { paFetchJson } from '../../../lib/pa-api';

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

interface RailwayMe {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  active: boolean;
  company_id: string | null;
  company_name: string | null;
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const url = new URL(request.url);
  const from = url.searchParams.get('from') ?? '';

  try {
    const form = await request.formData();
    const email = form.get('email')?.toString().trim() ?? '';
    const password = form.get('password')?.toString() ?? '';

    if (!email || !password) {
      return redirect(loginErrorUrl(from, 'missing_fields'));
    }

    if (!isDemoAuthMode() && !isSupabaseConfigured()) {
      console.error(
        '[api/auth/login] SUPABASE_URL is set but SUPABASE_ANON_KEY is missing (check Netlify env + deploy context).',
      );
      return redirect(loginErrorUrl(from, 'server_config'));
    }

    // ── Demo mode: password-less dummy session (Supabase not configured) ──
    if (isDemoAuthMode()) {
      const dummy = DUMMY_USERS[email];
      if (!dummy || password.length < 1) {
        return redirect(loginErrorUrl(from, 'invalid_credentials'));
      }

      const portalErrDummy = assertPortalMatchesRole(from, dummy.role);
      if (portalErrDummy) return redirect(portalErrDummy);

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
          secure: import.meta.env.PROD,
          maxAge: 60 * 60 * 24,
        },
      );

      return redirect(resolveRedirect(dummy.role, from));
    }

    // ── Step 1: Supabase sign-in (validates password, gives us a JWT) ────
    const supabase = getSupabaseAnon();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session || !data.user) {
      const errCode =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code?: string }).code ?? '')
          : '';
      const errMsg = (
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: string }).message ?? '')
          : ''
      ).toLowerCase();

      console.error('[api/auth/login] signInWithPassword failed', {
        email,
        code: errCode || undefined,
        message: error?.message,
      });

      if (errCode === 'email_not_confirmed' || errMsg.includes('email not confirmed')) {
        return redirect(loginErrorUrl(from, 'email_not_confirmed'));
      }

      return redirect(loginErrorUrl(from, 'invalid_credentials'));
    }

    const accessToken = data.session.access_token;

    // ── Step 2: Railway GET /api/me — source of truth for active + role ──
    // Uses requireAuth only (works for ANY role: admin, internal, client).
    // requireAuth itself blocks deactivated users with 403.

    let railwayUser: RailwayMe | null = null;

    if (import.meta.env.API_BASE_URL) {
      console.log('[api/auth/login] calling GET /api/me ...');

      const meCheck = await paFetchJson<RailwayMe>('/me', accessToken);

      console.log('[api/auth/login] /api/me response:', {
        ok: meCheck.ok,
        status: meCheck.status,
        role: meCheck.ok ? (meCheck.data as RailwayMe)?.role : undefined,
        active: meCheck.ok ? (meCheck.data as RailwayMe)?.active : undefined,
        error: !meCheck.ok ? meCheck.error : undefined,
      });

      if (meCheck.ok && meCheck.data) {
        railwayUser = meCheck.data;
      } else if (meCheck.status === 403) {
        // requireAuth rejected: deactivated or no profile row. Block login.
        const msg = String((meCheck.error as { message?: string })?.message ?? '');
        console.log('[api/auth/login] >>> BLOCKED by Railway 403:', msg);
        return redirect(loginErrorUrl(from, 'account_inactive'));
      } else {
        console.warn('[api/auth/login] /api/me failed, status:', meCheck.status);
        return redirect(loginErrorUrl(from, 'server_error'));
      }
    } else {
      console.warn('[api/auth/login] API_BASE_URL not set — cannot verify user in Railway');
    }

    // ── Step 3: Check deactivated ────────────────────────────────────────
    // requireAuth already blocks deactivated users (403 above), but double-check
    // the active field in case the response somehow got through.
    if (railwayUser && railwayUser.active === false) {
      console.log('[api/auth/login] >>> BLOCKED — Railway active=false:', email);
      return redirect(loginErrorUrl(from, 'account_inactive'));
    }

    // ── Step 4: Determine role (Railway is primary, Supabase is fallback) ─
    const userMeta = data.user.user_metadata ?? {};
    const role = railwayUser
      ? sessionRoleFromProfileOrMeta(railwayUser.role, null)
      : sessionRoleFromProfileOrMeta(
          userMeta.role as string | undefined,
          null,
        );

    console.log('[api/auth/login] resolved role:', {
      railwayRole: railwayUser?.role,
      metaRole: userMeta.role,
      finalRole: role,
    });

    // ── Step 5: Portal match ─────────────────────────────────────────────
    const portalErr = assertPortalMatchesRole(from, role);
    if (portalErr) {
      console.log('[api/auth/login] wrong portal:', { from, role });
      return redirect(portalErr);
    }

    // ── Step 6: Create session and redirect ──────────────────────────────
    const name =
      railwayUser?.full_name?.trim() ||
      (userMeta.full_name as string | undefined) ||
      (userMeta.name as string | undefined) ||
      email.split('@')[0];

    cookies.set(
      'session',
      JSON.stringify({
        role,
        email: data.user.email ?? email,
        name,
        supabaseAccessToken: accessToken,
        supabaseRefreshToken: data.session.refresh_token,
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

    console.log('[api/auth/login] login success:', { email, role, from });
    return redirect(resolveRedirect(role, from));
  } catch (err) {
    console.error('[api/auth/login]', err);
    return redirect(loginErrorUrl(from, 'server_error'));
  }
};
