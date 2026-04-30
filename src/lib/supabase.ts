import { createClient } from '@supabase/supabase-js';

/** Uses `SUPABASE_URL` + `SUPABASE_ANON_KEY` from `.env` locally or from Netlify env in production. */
export const supabase = createClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_ANON_KEY,
);

/** PostgREST requests as the signed-in user (RLS uses this JWT). */
export function createSupabaseWithUserJwt(accessToken: string) {
  return createClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_ANON_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    },
  );
}
