/**
 * Set passwords for users in **local** Supabase (auth.admin.updateUserById).
 *
 * Env (in `.env` — remove passwords after use):
 *   LOCAL_SET_PASSWORD           New password (required). Min length 8.
 *   LOCAL_SET_PASSWORD_EMAILS    Optional comma-separated emails; if omitted, updates every user with an email.
 *
 * Also accepts SYNC_LOCAL_DEFAULT_PASSWORD if LOCAL_SET_PASSWORD is unset (same value you use for sync).
 *
 *   SUPABASE_URL                  Local API URL (default http://127.0.0.1:54321)
 *   SUPABASE_SERVICE_ROLE_KEY     From `supabase status -o env` → SERVICE_ROLE_KEY=eyJ... (not sb_publishable_)
 *
 *   npm run auth:set-local-passwords
 */

import { createClient } from '@supabase/supabase-js';

const LOCAL_URL = process.env.SUPABASE_URL?.trim() || 'http://127.0.0.1:54321';
const LOCAL_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const PASSWORD =
  process.env.LOCAL_SET_PASSWORD?.trim() ||
  process.env.SYNC_LOCAL_DEFAULT_PASSWORD?.trim();

const EMAIL_FILTER_RAW = process.env.LOCAL_SET_PASSWORD_EMAILS?.trim();
const emailFilter =
  EMAIL_FILTER_RAW && EMAIL_FILTER_RAW.length > 0
    ? new Set(
        EMAIL_FILTER_RAW.split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean),
      )
    : null;

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function isPublishableSbKey(k) {
  return typeof k === 'string' && /^sb_publishable_/i.test(k);
}

if (!LOCAL_SERVICE) {
  die(`
Missing SUPABASE_SERVICE_ROLE_KEY.

  supabase status -o env
  → copy SERVICE_ROLE_KEY=eyJ... into .env
`);
}
if (isPublishableSbKey(LOCAL_SERVICE)) {
  die('SUPABASE_SERVICE_ROLE_KEY must not be the Publishable key (sb_publishable_...).');
}
if (!PASSWORD || PASSWORD.length < 8) {
  die(`
Set LOCAL_SET_PASSWORD (8+ chars), or SYNC_LOCAL_DEFAULT_PASSWORD.

  Example in .env:
    LOCAL_SET_PASSWORD=YourLocalDevSecret1!
    LOCAL_SET_PASSWORD_EMAILS=admin@example.com,client@example.com

  Omit LOCAL_SET_PASSWORD_EMAILS to update all users that have an email.
`);
}

const local = createClient(LOCAL_URL, LOCAL_SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function fetchAllUsers() {
  const all = [];
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await local.auth.admin.listUsers({ page, perPage });
    if (error) {
      const msg = error.message;
      if (/jwt|signature|verify|invalid|user not allowed/i.test(msg)) {
        die(`
listUsers failed: ${msg}

  Use SERVICE_ROLE_KEY from \`supabase status -o env\` as SUPABASE_SERVICE_ROLE_KEY.
`);
      }
      throw new Error(`listUsers page ${page}: ${msg}`);
    }
    const batch = data?.users ?? [];
    all.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
  }
  return all;
}

console.log(`\nLocal: ${LOCAL_URL}`);
if (emailFilter) {
  console.log(`Filter: ${[...emailFilter].join(', ')}`);
} else {
  console.log('Filter: (all users with an email)');
}
console.log('');

const users = await fetchAllUsers();
let updated = 0;
let skipped = 0;

for (const u of users) {
  const email = u.email?.trim();
  if (!email) {
    skipped += 1;
    continue;
  }
  if (emailFilter && !emailFilter.has(email.toLowerCase())) {
    skipped += 1;
    continue;
  }

  const { error } = await local.auth.admin.updateUserById(u.id, { password: PASSWORD });
  if (error) {
    console.error(`  ✗ ${email} (${u.id}): ${error.message}`);
    continue;
  }
  console.log(`  ✓ ${email}`);
  updated += 1;
}

console.log(`\nDone. updated=${updated} skipped=${skipped}`);
console.log('Remove LOCAL_SET_PASSWORD from .env when finished.\n');
