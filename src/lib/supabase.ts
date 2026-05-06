import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Netlify + Supabase: same pattern as AstroChatBot (`src/lib/supabase.ts` there) —
 * Vite inlines `import.meta.env.SUPABASE_*` from Netlify’s env during `npm run build`.
 * Falls back to `process.env` / `PUBLIC_*` for runtime-only or alternate names.
 */
function envFromProcess(key: string): string {
  if (typeof process === "undefined" || !process.env) return "";
  const v = process.env[key];
  return typeof v === "string" ? v.trim() : "";
}

function readCredentials(): { url: string; anonKey: string } {
  const url =
    (import.meta.env.SUPABASE_URL || "").trim() ||
    envFromProcess("SUPABASE_URL") ||
    envFromProcess("PUBLIC_SUPABASE_URL") ||
    (import.meta.env.PUBLIC_SUPABASE_URL || "").trim();

  const anonKey =
    (import.meta.env.SUPABASE_ANON_KEY || "").trim() ||
    envFromProcess("SUPABASE_ANON_KEY") ||
    envFromProcess("PUBLIC_SUPABASE_ANON_KEY") ||
    (import.meta.env.PUBLIC_SUPABASE_ANON_KEY || "").trim() ||
    (import.meta.env.DEV
      ? (
          import.meta.env.SUPABASE_KEY ||
          envFromProcess("SUPABASE_KEY") ||
          ""
        ).trim()
      : "");

  console.log("url: ", url);
  console.log("anonKey: ", anonKey);
  return { url, anonKey };
}

/**
 * Password-less dummy sessions (dev only). Never enabled for production builds so
 * Netlify always uses real Supabase `signInWithPassword` — configure
 * `SUPABASE_URL` + `SUPABASE_ANON_KEY` on the host.
 */
export function isDemoAuthMode(): boolean {
  if (import.meta.env.PROD) {
    console.log("PROD: ", import.meta.env.PROD);
    return false;
  }

  const { url } = readCredentials();
  return !url || url === "https://placeholder.supabase.co";
}

/** True when a real Supabase project URL and anon key are both present (SSR / Netlify). */
export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = readCredentials();
  if (!url || url === "https://placeholder.supabase.co") return false;
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
      "Supabase is not configured: set SUPABASE_URL and SUPABASE_ANON_KEY (Netlify → Environment variables; include Branch deploys / All contexts).",
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
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must both be set.");
  }
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}
