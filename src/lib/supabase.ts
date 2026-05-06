import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Prefer `process.env` on the server so Netlify (and other hosts) can inject
 * secrets at **runtime**. Vite may inline `import.meta.env` at build time — if CI
 * omits `SUPABASE_*`, the deployed function would otherwise see empty strings and
 * fall back to dummy login even after you fix env vars in the dashboard.
 */
function envFromProcess(key: 'SUPABASE_URL' | 'SUPABASE_ANON_KEY'): string {
  if (typeof process === 'undefined' || !process.env) return '';
  const v = process.env[key];
  return typeof v === 'string' ? v.trim() : '';
}

function readCredentials(): { url: string; anonKey: string } {
  const url = (envFromProcess('SUPABASE_URL') || (import.meta.env.SUPABASE_URL ?? '')).trim();
  // Local dev: many Supabase snippets use SUPABASE_KEY for the anon JWT; production uses SUPABASE_ANON_KEY.
  const anonKey = (
    envFromProcess('SUPABASE_ANON_KEY') ||
    import.meta.env.SUPABASE_ANON_KEY ||
    (import.meta.env.DEV ? import.meta.env.SUPABASE_KEY : '') ||
    ''
  ).trim();
  return { url, anonKey };
}

/**
 * Password-less dummy sessions (dev only). Never enabled for production builds so
 * Netlify always uses real Supabase `signInWithPassword` — configure
 * `SUPABASE_URL` + `SUPABASE_ANON_KEY` on the host.
 */
export function isDemoAuthMode(): boolean {
  if (import.meta.env.PROD) return false;
  const { url } = readCredentials();
  return !url || url === 'https://placeholder.supabase.co';
}

/** True when a real Supabase project URL and anon key are both present (SSR / Netlify). */
export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = readCredentials();
  if (!url || url === 'https://placeholder.supabase.co') return false;
  return anonKey.length > 0;
}

let cachedAnon: SupabaseClient | null = null;
let cachedAnonKey: string | null = null;

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
  const { url, anonKey } = readCredentials();
  const sig = `${url}::${anonKey}`;
  if (!cachedAnon || cachedAnonKey !== sig) {
    cachedAnon = createClient(url, anonKey);
    cachedAnonKey = sig;
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
