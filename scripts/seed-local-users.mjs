/**
 * Creates (or upserts) local dev test users in local Supabase.
 * Run once after `supabase start` and migrations are applied:
 *
 *   supabase db reset
 *   npm run seed:users
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in `.env` (from `supabase status` — never commit it).
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
console.log('\nDone. Start the dev server: npm run dev\n');
