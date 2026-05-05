/**
 * Creates (or upserts) local dev test users in local Supabase.
 * Run once after `supabase start` and migrations are applied:
 *
 *   supabase db reset
 *   npm run seed:users
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in `.env` (from `supabase status -o env` → SERVICE_ROLE_KEY=eyJ...
 * — the JWT, not sb_publishable_; sb_secret_ may not work for admin API on some CLI versions).
 * `public.profiles` rows follow from auth user_metadata via DB triggers.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL?.trim() || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!SUPABASE_SERVICE_KEY) {
  console.error(`
  Missing SUPABASE_SERVICE_ROLE_KEY.

  1. Run: supabase status
  2. Copy the "service_role" / secret key into .env:
       SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

  3. Run: npm run seed:users
     (or: node --env-file=.env scripts/seed-local-users.mjs)

  Do not put real keys in this file — GitHub push protection will block the push.
`);
  process.exit(1);
}

const TEST_USERS = [
  { email: 'admin@b2brouter.com', password: 'Admin1234!', role: 'admin', full_name: 'Admin User' },
  { email: 'analyst@b2brouter.com', password: 'Admin1234!', role: 'internal', full_name: 'Sofia Analyst' },
  { email: 'client@acmecorp.com', password: 'Admin1234!', role: 'client', full_name: 'Carlos Ruiz' },
];

/** Optional: add your real account to local Supabase (not committed). */
function extraUserFromEnv() {
  const email = process.env.SEED_EXTRA_EMAIL?.trim();
  const password = process.env.SEED_EXTRA_PASSWORD?.trim();
  const role = (process.env.SEED_EXTRA_ROLE ?? 'admin').trim().toLowerCase();
  const full_name = (process.env.SEED_EXTRA_FULL_NAME ?? email?.split('@')[0] ?? 'User').trim();
  if (!email || !password) return null;
  const r = ['admin', 'internal', 'client'].includes(role) ? role : 'admin';
  return { email, password, role: r, full_name };
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function upsertUser({ email, password, role, full_name }) {
  const { data: { users }, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) {
    console.error('  list error:', listErr.message);
    return;
  }

  const existing = users.find((u) => u.email === email);

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      user_metadata: { role, full_name },
    });
    if (error) {
      console.error(`  ✗ Update failed for ${email}:`, error.message);
    } else {
      console.log(`  ✓ Updated metadata for ${email}  [role=${role}]`);
    }
  } else {
    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role, full_name },
    });
    if (error) {
      console.error(`  ✗ Create failed for ${email}:`, error.message);
    } else {
      console.log(`  ✓ Created ${email}  [role=${role}]  password: ${password}`);
    }
  }
}

console.log('\nSeeding local Supabase users...\n');
for (const user of TEST_USERS) {
  await upsertUser(user);
}
const extra = extraUserFromEnv();
if (extra) {
  console.log('  (from SEED_EXTRA_* env)\n');
  await upsertUser(extra);
}
console.log('\nDone. Start the dev server: npm run dev\n');
