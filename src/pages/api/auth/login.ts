import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

const IS_DUMMY_MODE =
  !import.meta.env.SUPABASE_URL ||
  import.meta.env.SUPABASE_URL === 'https://placeholder.supabase.co';

// Fallback users used only when SUPABASE_URL is the placeholder (local dev without Supabase)
const DUMMY_USERS: Record<string, { name: string; role: string; redirect: string }> = {
  'admin@b2brouter.com':    { name: 'Admin User',    role: 'admin',    redirect: '/admin/dashboard' },
  'analyst@b2brouter.com':  { name: 'Sofia Analyst', role: 'internal', redirect: '/dashboard' },
  'client@acmecorp.com':    { name: 'Carlos Ruiz',   role: 'client',   redirect: '/dashboard' },
};

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const url      = new URL(request.url);
  const from     = url.searchParams.get('from') ?? ''; // 'admin' | 'customer' | ''

  const form     = await request.formData();
  const email    = form.get('email')?.toString().trim() ?? '';
  const password = form.get('password')?.toString() ?? '';

  if (!email || !password) {
    return redirect(`/login?error=missing_fields${from ? `&from=${from}` : ''}`);
  }

  /** Resolve the post-login redirect destination based on role + portal intent. */
  function resolveRedirect(role: string): string {
    if (from === 'customer') return '/dashboard';          // always land on user portal
    if (from === 'admin')    return role === 'admin' ? '/admin/dashboard' : '/dashboard';
    return role === 'admin' ? '/admin/dashboard' : '/dashboard'; // no intent: role default
  }

  // ── Dev / Demo mode (no real Supabase project yet) ───────────────────────
  if (IS_DUMMY_MODE) {
    const dummy = DUMMY_USERS[email];
    if (!dummy || password.length < 1) {
      return redirect(`/login?error=invalid_credentials${from ? `&from=${from}` : ''}`);
    }

    cookies.set('session', JSON.stringify({
      role:      dummy.role,
      email,
      name:      dummy.name,
      loggedInAt: new Date().toISOString(),
    }), {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
    });

    return redirect(resolveRedirect(dummy.role));
  }

  // ── Production mode (real Supabase project) ──────────────────────────────

  // 1. Authenticate with Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    return redirect(`/login?error=invalid_credentials${from ? `&from=${from}` : ''}`);
  }

  // 2. Read role from user_metadata (set in Supabase dashboard → User → Edit → user_metadata)
  //    Once Railway backend is deployed, replace this with:
  //    const res  = await fetch(`${import.meta.env.API_BASE_URL}/auth/me`, {
  //      headers: { Authorization: `Bearer ${data.session.access_token}` }
  //    });
  //    const { role, full_name } = await res.json();
  const userMeta = data.user?.user_metadata ?? {};
  const role     = (userMeta.role     as string) ?? 'client';
  const name     = (userMeta.full_name as string) ?? email.split('@')[0];

  // 3. Store as httpOnly session cookie (JWT never exposed to JavaScript)
  cookies.set('session', JSON.stringify({
    role,
    email: data.user?.email ?? email,
    name,
    supabaseAccessToken: data.session.access_token,
    loggedInAt: new Date().toISOString(),
  }), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD, // false locally (HTTP), true on Netlify (HTTPS)
    maxAge: 60 * 60 * 24,
  });

  return redirect(resolveRedirect(role));
};
