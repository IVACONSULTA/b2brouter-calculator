import type { APIRoute } from 'astro';
import { getSession, isAdminRole } from '../../../../../lib/session';
import { getFreshSupabaseAccessToken } from '../../../../../lib/supabase-session';
import { paPostJson } from '../../../../../lib/pa-api';

export const prerender = false;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * POST /api/pa/admin/wizard/run-analysis
 *
 * Triggers document analysis for the given profile.
 * The analysis message is injected server-side from DOCUMENT_ANALYSIS_MESSAGE env var.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const session = getSession(cookies);
  if (!session || !isAdminRole(session.role)) {
    return json(403, { error: 'Forbidden', message: 'Admin sign-in required.' });
  }

  let body: {
    profile_slug?: string;
    calculation_profile_id?: string;
    country_id?: string;
    provider_id?: string;
    calculation_basis?: string;
    notes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Invalid JSON body.' });
  }

  const profile_slug = String(body.profile_slug ?? '').trim();
  const calculation_profile_id = String(body.calculation_profile_id ?? '').trim();
  const country_id = String(body.country_id ?? '').trim();
  const provider_id = String(body.provider_id ?? '').trim();
  const calculation_basis = String(body.calculation_basis ?? '').trim();
  const notes = String(body.notes ?? '').trim();

  if (!profile_slug || !calculation_profile_id || !country_id || !provider_id) {
    return json(400, {
      error:
        'profile_slug, calculation_profile_id, country_id, and provider_id are required.',
    });
  }

  const fresh = await getFreshSupabaseAccessToken(cookies);
  if (!fresh.ok) {
    return json(401, {
      error: 'Unauthorized',
      message:
        fresh.code === 'no_session' || fresh.code === 'no_token'
          ? 'Not signed in with Supabase.'
          : 'Session expired. Please sign in again.',
    });
  }

  // Get the analysis message from environment variable
  // This is the prompt/instruction sent to the document analysis agent
  let analysisMessage = import.meta.env.DOCUMENT_ANALYSIS_MESSAGE ||
    process.env.DOCUMENT_ANALYSIS_MESSAGE ||
    '';

  // Append calculation_basis and notes to the message for the document agent
  let enhancedMessage = analysisMessage;
  if (calculation_basis) {
    enhancedMessage += `\n\nUse as calculation_basis=${calculation_basis} for transaction_rules records.`;
  }
  if (notes) {
    enhancedMessage += `\n\nAdditional context from admin: ${notes}`;
  }

  console.log('[run-analysis] Sending enhanced message to document agent:', {
    original_length: analysisMessage.length,
    enhanced_length: enhancedMessage.length,
    has_calculation_basis: Boolean(calculation_basis),
    has_notes: Boolean(notes),
  });

  const result = await paPostJson<unknown>(
    '/admin/wizard/run-analysis',
    fresh.accessToken,
    {
      profile_slug,
      calculation_profile_id,
      country_id,
      provider_id,
      message: enhancedMessage, // Pass the enhanced analysis message to the API
    },
  );

  if (!result.ok) {
    return json(result.status || 502, result.error);
  }

  // API returns 202 (async kick-off, body contains analysis_id) or legacy 201.
  return json(result.status || 202, result.data);
};
