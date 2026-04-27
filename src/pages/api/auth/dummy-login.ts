import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const role = formData.get('role')?.toString();

  if (role !== 'admin' && role !== 'customer') {
    return new Response('Invalid role', { status: 400 });
  }

  // Dummy session — stores the role in a cookie.
  // Replace this with a real Supabase session once auth is wired up.
  const dummySession = JSON.stringify({
    role,
    email: role === 'admin' ? 'admin@example.com' : 'customer@example.com',
    name: role === 'admin' ? 'Admin User' : 'Customer User',
    loggedInAt: new Date().toISOString(),
  });

  cookies.set('session', dummySession, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return redirect(role === 'admin' ? '/admin/dashboard' : '/customer/dashboard');
};
