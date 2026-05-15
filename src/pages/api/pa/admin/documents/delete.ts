import type { APIRoute } from 'astro';
import { getSession } from '../../../../../lib/session';
import { paFetchJson } from '../../../../../lib/pa-api';
import { getFreshSupabaseAccessToken } from '../../../../../lib/supabase-session';

/**
 * DELETE /api/pa/admin/documents/delete?id=<document_id>
 * Proxies to Plan Advisor DELETE /admin/documents/:id
 */
export const DELETE: APIRoute = async ({ request, cookies, url }) => {
  const session = getSession(cookies);
  if (!session || session.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const documentId = url.searchParams.get('id');
  if (!documentId || !documentId.trim()) {
    return new Response(JSON.stringify({ error: 'Missing document id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const fresh = await getFreshSupabaseAccessToken(cookies);
  if (!fresh.ok) {
    return new Response(
      JSON.stringify({ error: 'Session expired. Please sign in again.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const paToken = fresh.accessToken;
  const deleteResult = await paFetchJson(
    `/admin/documents/${encodeURIComponent(documentId)}`,
    paToken,
    {
      method: 'DELETE',
    }
  );

  if (!deleteResult.ok) {
    return new Response(
      JSON.stringify({
        error: deleteResult.data?.error || 'Delete failed',
        status: deleteResult.status,
      }),
      { status: deleteResult.status, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(JSON.stringify(deleteResult.data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
