import type { APIRoute } from 'astro';
import {
  clearSessionCookie,
  inferLogoutFromSession,
  logoutRedirectPath,
} from '../../../lib/logout';

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
  let from = url.searchParams.get('from')?.trim() ?? '';

  const contentType = request.headers.get('content-type') ?? '';
  if (
    !from &&
    (contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data'))
  ) {
    try {
      const fd = await request.formData();
      from = fd.get('from')?.toString().trim() ?? '';
    } catch {
      /* non-form POST */
    }
  }

  if (!from) {
    from = inferLogoutFromSession(cookies);
  }

  clearSessionCookie(cookies);

  return redirect(logoutRedirectPath(from));
};
