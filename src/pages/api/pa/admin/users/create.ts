import type { APIRoute } from 'astro';
import { paPostJson } from '../../../../../lib/pa-api';
import { getFreshSupabaseAccessToken } from '../../../../../lib/supabase-session';
import { getSession, isAdminRole } from '../../../../../lib/session';

export const prerender = false;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * POST /api/pa/admin/users/create
 * Creates a new user in Supabase Auth and users_profile atomically.
 * Body: { email, password, full_name, role, company_id }
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const session = getSession(cookies);
  if (!session || !isAdminRole(session.role)) {
    return json(403, { error: 'Forbidden', message: 'Admin sign-in required.' });
  }

  let body: {
    email?: string;
    password?: string;
    full_name?: string;
    role?: 'admin' | 'internal' | 'client';
    company_id?: string;
  };

  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  // Validation
  if (!body.email || !body.password || !body.role) {
    return json(400, {
      error: 'email, password, and role are required',
      received: { email: !!body.email, password: !!body.password, role: !!body.role }
    });
  }

  const validRoles = ['admin', 'internal', 'client'];
  if (!validRoles.includes(body.role)) {
    return json(400, { error: `role must be one of: ${validRoles.join(', ')}` });
  }

  if (body.role === 'client' && !body.company_id) {
    return json(400, { error: 'company_id is required for client users' });
  }

  const fresh = await getFreshSupabaseAccessToken(cookies);
  if (!fresh.ok || !fresh.accessToken) {
    return json(401, {
      error: 'Unauthorized',
      message: fresh.code === 'no_session' || fresh.code === 'no_token'
        ? 'Not signed in with Supabase.'
        : 'Session expired. Please sign in again.',
    });
  }

  // Forward to PlanAdvisorAPI
  const result = await paPostJson<{
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    company_id: string | null;
    active: boolean;
    created_at: string;
    supabase_user_id: string;
    message: string;
  }>('/admin/users/create', fresh.accessToken, {
    email: body.email,
    password: body.password,
    full_name: body.full_name,
    role: body.role,
    company_id: body.company_id,
  });

  if (!result.ok) {
    return json(result.status || 502, result.error);
  }

  return json(201, result.data);
};
