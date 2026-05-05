/**
 * Copy Supabase Auth users from a cloud project into local Supabase (supabase start).
 *
 * You need **two different** secrets:
 *   • LOCAL:  SUPABASE_SERVICE_ROLE_KEY = legacy **SERVICE_ROLE** JWT from `supabase status -o env`
 *             (starts with eyJ...). Do **not** use sb_publishable_; sb_secret_ often hits "User not allowed"
 *             with auth.admin — use the JWT line if that happens.
 *   • CLOUD:  SUPABASE_PROD_SERVICE_ROLE_KEY = service_role from the hosted dashboard.
 * Never use the production service_role as the local key — signatures will not verify (JWT error).
 *
 * What is synced: email, phone (if any), user_metadata, app_metadata, confirmed flags.
 * What is NOT synced: passwords (hashes cannot be read). New local accounts get
 * SYNC_LOCAL_DEFAULT_PASSWORD. Existing local accounts are only metadata-patched unless
 * you also set RESET_LOCAL_PASSWORD=1 (then password is updated to the default).
 *
 * User **ids match production**: `auth.admin.createUser({ id: prodUser.id, ... })` is supported by
 * GoTrue. If a local user already exists with the same email but a **different** id (from an older
 * sync), this script deletes the local row and recreates it with the prod UUID (CASCADE removes
 * linked `public.profiles`; trigger recreates profile from metadata).
 *
 * Usage (add vars to .env — see .env.example):
 *
 *   npm run sync:auth:prod-to-local
 *
 * Or: node --env-file=.env scripts/sync-prod-auth-to-local.mjs
 */

import { createClient } from '@supabase/supabase-js';

const LOCAL_URL = process.env.SUPABASE_URL?.trim() || 'http://127.0.0.1:54321';
const LOCAL_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const PROD_URL = process.env.SUPABASE_PROD_URL?.trim();
const PROD_SERVICE = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY?.trim();

const DEFAULT_PW = process.env.SYNC_LOCAL_DEFAULT_PASSWORD?.trim();
const RESET_PW = ['1', 'true', 'yes'].includes(
  String(process.env.RESET_LOCAL_PASSWORD ?? '').toLowerCase(),
);

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function isPublishableSbKey(k) {
  return typeof k === 'string' && /^sb_publishable_/i.test(k);
}

if (!LOCAL_SERVICE) {
  die(`
Missing SUPABASE_SERVICE_ROLE_KEY for LOCAL (Docker Supabase only — not cloud).

  From the directory that contains ./supabase (e.g. PlanAdvisorFront), run:

    supabase status -o env

  Copy the line (no quotes):

    SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

  into .env as:

    SUPABASE_SERVICE_ROLE_KEY=eyJ...

  That JWT is what supabase-js needs for auth.admin.* on local. Do not use your production key here.

  If you only ran \`supabase status\` (table view), avoid the **Publishable** key; **sb_secret_** can
  still return "User not allowed" on some CLI versions — prefer SERVICE_ROLE_KEY from \`-o env\`.
`);
}
if (isPublishableSbKey(LOCAL_SERVICE)) {
  die(`
SUPABASE_SERVICE_ROLE_KEY looks like the Publishable key (sb_publishable_...).

  auth.admin requires the **service role** value. Use:
    supabase status -o env
  and set SUPABASE_SERVICE_ROLE_KEY to **SERVICE_ROLE_KEY** (eyJ... JWT), not ANON / publishable.
`);
}
if (!PROD_URL) {
  die(`
Missing SUPABASE_PROD_URL.

  Open your hosted project in the browser (Supabase Dashboard), then:
    Project Settings → Data API → Project URL
  Example shape:  https://<project-ref>.supabase.co
  Put it in .env as:  SUPABASE_PROD_URL=https://....supabase.co
`);
}
if (!PROD_SERVICE) {
  die(`
Missing SUPABASE_PROD_SERVICE_ROLE_KEY — this is NOT shown by \`supabase status\`.

  \`supabase status\` only lists keys for LOCAL Docker (Publishable / Secret).

  For PRODUCTION you must use the cloud dashboard:
    https://supabase.com/dashboard/project/_/settings/api
    (pick your project, then Settings → API → Project API keys)

  Under "Project API keys", reveal and copy the key named **service_role** (secret).
  Put it in .env as:
    SUPABASE_PROD_SERVICE_ROLE_KEY=<paste service_role key>

  Never commit this value; remove it from .env after sync if you want.
`);
}
if (!DEFAULT_PW || DEFAULT_PW.length < 8) {
  die(
    'Set SYNC_LOCAL_DEFAULT_PASSWORD to a strong local-only password (8+ chars). All newly created local users will use it.',
  );
}

const prod = createClient(PROD_URL, PROD_SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const local = createClient(LOCAL_URL, LOCAL_SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function fetchAllUsers(adminClient, label) {
  const all = [];
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`listUsers (${label}) page ${page}: ${error.message}`);
    }
    const batch = data?.users ?? [];
    all.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
  }
  return all;
}

async function listLocalUsersByEmail() {
  const users = await fetchAllUsers(local, 'local');
  const map = new Map();
  for (const u of users) {
    if (u.email) map.set(u.email.toLowerCase(), u);
  }
  return map;
}

console.log('\nSync prod → local Supabase Auth\n');
console.log(`  Prod:  ${PROD_URL}`);
console.log(`  Local: ${LOCAL_URL}\n`);

let prodUsers;
try {
  prodUsers = await fetchAllUsers(prod, 'prod');
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  if (/jwt|signature|verify|invalid/i.test(msg)) {
    die(`
listUsers (prod) failed — check SUPABASE_PROD_SERVICE_ROLE_KEY.

  Use the **service_role** key from the cloud dashboard (Settings → API), not the local Secret.

  Underlying: ${msg}
`);
  }
  throw e;
}

let localByEmail;
try {
  localByEmail = await listLocalUsersByEmail();
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  if (/jwt|signature|verify|invalid/i.test(msg)) {
    die(`
listUsers (local) failed — wrong SUPABASE_SERVICE_ROLE_KEY for this stack.

  Use the **legacy JWT** from your machine (not production):
    supabase status -o env
  → copy SERVICE_ROLE_KEY=eyJ... into SUPABASE_SERVICE_ROLE_KEY.

  Do NOT use your production service_role key for local.

  Underlying: ${msg}
`);
  }
  if (/user not allowed/i.test(msg)) {
    die(`
listUsers (local): "User not allowed" — local key is not accepted as service_role for Auth admin.

  Fix (recommended):
    cd <folder with supabase/config.toml>
    supabase status -o env

  Set in .env:
    SUPABASE_SERVICE_ROLE_KEY=<paste SERVICE_ROLE_KEY value — the long eyJ... JWT>

  The default \`supabase status\` table shows **sb_secret_...**; many CLI versions still need the
  **SERVICE_ROLE_KEY** line admin APIs. See: https://github.com/supabase/cli/issues/4524

  Optional: upgrade Supabase CLI (e.g. 2.74.4+ / 2.78+) and retry.

  Underlying: ${msg}
`);
  }
  throw e;
}

let created = 0;
let updated = 0;
let replaced = 0;
let skipped = 0;
let failed = 0;

for (const u of prodUsers) {
  const email = u.email?.trim();
  if (!email) {
    console.warn(`  ⊗ Skip user id=${u.id} (no email — OAuth-only or incomplete).`);
    skipped += 1;
    continue;
  }

  const key = email.toLowerCase();
  let existing = localByEmail.get(key);

  try {
    if (existing && existing.id !== u.id) {
      const oldId = existing.id;
      const { error: delErr } = await local.auth.admin.deleteUser(oldId);
      if (delErr) throw delErr;
      localByEmail.delete(key);
      existing = undefined;
      replaced += 1;
      console.log(
        `  ↺ Removed local user ${email} (had id=${oldId}, prod has id=${u.id}); recreating with prod id…`,
      );
    }

    if (existing && existing.id === u.id) {
      const { error } = await local.auth.admin.updateUserById(u.id, {
        email,
        user_metadata: u.user_metadata ?? {},
        app_metadata: u.app_metadata ?? {},
        ...(u.phone ? { phone: u.phone } : {}),
        ...(RESET_PW ? { password: DEFAULT_PW } : {}),
      });
      if (error) throw error;
      console.log(`  ✓ Updated metadata  ${email}  [id=${u.id}]`);
      updated += 1;
    } else {
      const { data, error } = await local.auth.admin.createUser({
        id: u.id,
        email,
        password: DEFAULT_PW,
        email_confirm: true,
        user_metadata: u.user_metadata ?? {},
        app_metadata: u.app_metadata ?? {},
        ...(u.phone ? { phone: u.phone, phone_confirm: !!u.phone_confirmed_at } : {}),
      });
      if (error) throw error;
      console.log(
        `  ✓ Created  ${email}  [id=${data.user?.id}  matches prod]  password=<SYNC_LOCAL_DEFAULT_PASSWORD>`,
      );
      created += 1;
      if (data.user?.id) localByEmail.set(key, data.user);
    }
  } catch (e) {
    failed += 1;
    console.error(`  ✗ ${email}: ${e?.message ?? e}`);
  }
}

console.log(
  `\nDone. created=${created} updated=${updated} replaced=${replaced} skipped=${skipped} failed=${failed}\n` +
    `Local auth user ids should match production for synced emails. Sign in with SYNC_LOCAL_DEFAULT_PASSWORD.\n` +
    (RESET_PW ? '(RESET_LOCAL_PASSWORD was set — existing matching-id users also got the new password.)\n' : ''),
);

if (failed > 0) process.exit(1);
