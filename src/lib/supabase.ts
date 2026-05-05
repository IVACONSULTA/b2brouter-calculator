import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function readCredentials(): { url: string; anonKey: string } {
  const url = (import.meta.env.SUPABASE_URL ?? '').trim();
  // Local dev: many Supabase snippets use SUPABASE_KEY for the anon JWT; production uses SUPABASE_ANON_KEY.
  const anonKey = (
    import.meta.env.SUPABASE_ANON_KEY ??
    (import.meta.env.DEV ? import.meta.env.SUPABASE_KEY : '') ??
    ''
  ).trim();
  return { url, anonKey };
}

/** True when a real Supabase project URL and anon key are both present (SSR / Netlify). */
export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = readCredentials();
  if (!url || url === 'https://placeholder.supabase.co') return false;
  return anonKey.length > 0;
}

let cachedAnon: SupabaseClient | null = null;

/**
 * Anon-key client for server routes (e.g. `signInWithPassword`).
 * Call only when `isSupabaseConfigured()` is true — otherwise throws a clear error.
 */
export function getSupabaseAnon(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured: set SUPABASE_URL and SUPABASE_ANON_KEY (Netlify → Environment variables; include Branch deploys / All contexts).',
    );
  }
  if (!cachedAnon) {
    const { url, anonKey } = readCredentials();
    cachedAnon = createClient(url, anonKey);
  }
  return cachedAnon;
}

/** PostgREST requests as the signed-in user (RLS uses this JWT). */
export function createSupabaseWithUserJwt(accessToken: string): SupabaseClient {
  const { url, anonKey } = readCredentials();
  if (!url || !anonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must both be set.');
  }
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}
