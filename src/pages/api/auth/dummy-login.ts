import type { APIRoute } from 'astro';

const VALID_ROLES = ['admin', 'internal', 'client', 'customer'] as const;
type Role = typeof VALID_ROLES[number];

const DUMMY_USERS: Record<Role, { email: string; name: string; redirect: string }> = {
  admin:    { email: 'admin@b2brouter.com',    name: 'Admin User',     redirect: '/admin/dashboard' },
  internal: { email: 'analyst@b2brouter.com',  name: 'Sofia Analyst',  redirect: '/dashboard' },
  client:   { email: 'client@acmecorp.com',    name: 'Carlos Ruiz',    redirect: '/dashboard' },
  customer: { email: 'customer@example.com',   name: 'Customer User',  redirect: '/dashboard' },
};

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  if (import.meta.env.PROD) {
    return new Response('Not found', { status: 404 });
  }

  const formData = await request.formData();
  const role = formData.get('role')?.toString() as Role | undefined;

  if (!role || !VALID_ROLES.includes(role)) {
    return new Response('Invalid role', { status: 400 });
  }

  const user = DUMMY_USERS[role];

  // Dummy session — stores the role in a cookie.
  // Replace with Supabase signInWithPassword + Railway role lookup once wired up.
  const dummySession = JSON.stringify({
    role,
    email: user.email,
    name: user.name,
    loggedInAt: new Date().toISOString(),
  });

  cookies.set('session', dummySession, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return redirect(user.redirect);
};
