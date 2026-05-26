import type { APIRoute } from 'astro';
import {
  createSupabaseWithUserJwt,
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

    // Supabase expected but credentials incomplete (common Netlify misconfiguration).
    if (!isDemoAuthMode() && !isSupabaseConfigured()) {
      console.error(
        '[api/auth/login] SUPABASE_URL is set but SUPABASE_ANON_KEY is missing (check Netlify env + deploy context).',
      );
      return redirect(loginErrorUrl(from, 'server_config'));
    }

    // ── Local dev: password-less dummy session when Supabase is not configured ─
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

    // ── Supabase: role from public.profiles (see DB triggers + migrations) ───
    const supabase = getSupabaseAnon();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session || !data.user) {
      const errCode =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code?: string }).code ?? '')
          : '';
      const errMsg = (error && typeof error === 'object' && 'message' in error
        ? String((error as { message?: string }).message ?? '')
        : ''
      ).toLowerCase();

      console.error('[api/auth/login] signInWithPassword failed', {
        email,
        code: errCode || undefined,
        message: error?.message,
        status: (error as { status?: number })?.status,
      });

      if (
        errCode === 'email_not_confirmed' ||
        errMsg.includes('email not confirmed')
      ) {
        return redirect(loginErrorUrl(from, 'email_not_confirmed'));
      }

      return redirect(loginErrorUrl(from, 'invalid_credentials'));
    }

    const userMeta = data.user.user_metadata ?? {};
    const userSb = createSupabaseWithUserJwt(data.session.access_token);
    const { data: profile } = await userSb
      .from('profiles')
      .select('role, full_name, active')
      .eq('id', data.user.id)
      .maybeSingle();

    console.log('[api/auth/login] User authenticated:', { 
      email: data.user.email, 
      userId: data.user.id,
      supabaseActive: profile?.active,
      apiBaseUrl: import.meta.env.API_BASE_URL ? 'SET' : 'NOT SET'
    });

    // Check if user is active - Railway database is the authoritative source of truth
    let isActive: boolean | undefined;
    
    // Always check Railway database for authoritative active status (if API is available)
    if (import.meta.env.API_BASE_URL) {
      console.log('[api/auth/login] Checking Railway API for active status...');
      try {
        const paCheck = await paFetchJson(
          `/admin/users/${encodeURIComponent(data.user.id)}`,
          data.session.access_token,
        );
        console.log('[api/auth/login] Railway API response:', { 
          ok: paCheck.ok, 
          status: paCheck.status,
          hasData: !!paCheck.data,
          rawData: paCheck.data 
        });
        
        if (paCheck.ok && paCheck.data) {
          const railwayData = paCheck.data as { active?: boolean; email?: string; id?: string };
          console.log('[api/auth/login] Railway user data:', { 
            id: railwayData.id, 
            email: railwayData.email, 
            active: railwayData.active,
            activeType: typeof railwayData.active
          });
          
          // Explicitly check for boolean false - don't use ?? which converts false to true
          const railwayActive = railwayData.active;
          isActive = railwayActive === false ? false : (railwayActive === true ? true : undefined);
          console.log('[api/auth/login] Parsed Railway active status:', { active: isActive, fromValue: railwayActive });
        } else {
          console.log('[api/auth/login] Railway API returned no data or not ok, falling back to Supabase');
        }
      } catch (e) {
        // If API check fails, fall back to Supabase value (or assume active if neither available)
        console.warn('[api/auth/login] Failed to check active status from Railway, using Supabase fallback:', e);
        isActive = profile?.active as boolean | undefined;
      }
    } else {
      console.log('[api/auth/login] API_BASE_URL not set, skipping Railway check');
    }
    
    // If Railway check didn't work or API not available, use Supabase
    if (isActive === undefined) {
      console.log('[api/auth/login] Using Supabase active status fallback:', profile?.active);
      isActive = profile?.active as boolean | undefined;
    }

    // Default to active only if no source available at all (new users, etc.)
    if (isActive === undefined) {
      console.log('[api/auth/login] No active status found, defaulting to true for user:', data.user.id);
      isActive = true;
    }

    console.log('[api/auth/login] Final active status:', { email: data.user.email, isActive, willBlock: !isActive });

    if (!isActive) {
      console.log('[api/auth/login] >>> BLOCKING LOGIN - User is inactive:', data.user.id, data.user.email);
      return redirect(loginErrorUrl(from, 'account_inactive'));
    }
    
    console.log('[api/auth/login] Login allowed - user is active');

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

    return redirect(resolveRedirect(role, from));
  } catch (err) {
    console.error('[api/auth/login]', err);
    return redirect(loginErrorUrl(from, 'server_error'));
  }
};
