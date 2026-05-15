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
  /** AgenteDocumental crew base URL (CrewAI FastAPI), e.g. http://127.0.0.1:8788 */
  readonly PLAN_ADVISOR_CREW_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
