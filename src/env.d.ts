/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY: string;
  /** Alias used by some local setups (`supabase status` snippets); only honored in dev — prefer SUPABASE_ANON_KEY. */
  readonly SUPABASE_KEY?: string;
  /** Optional Astro public overrides (same values as Supabase dashboard); prefer server secrets on Netlify. */
  readonly PUBLIC_SUPABASE_URL?: string;
  readonly PUBLIC_SUPABASE_ANON_KEY?: string;
  /** Plan Advisor Express API (Railway), e.g. http://localhost:3000 — no trailing slash required. */
  readonly API_BASE_URL: string;
  /** Must match Railway `PA_PLAN_API_KEY` when the API key gate is enabled. */
  readonly PA_PLAN_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
