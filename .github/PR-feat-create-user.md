## Summary

Admin **user management UX** (create user, edit user with Supabase sync), **modify calculation profile** workflow, and **inactive account login blocking**. Includes optional **browser-console auth debug** for Netlify troubleshooting.

Pairs with PlanAdvisorAPI branch `feat/create-user` (`POST /users/create`, `PATCH /users/:id`, `GET /companies`, `POST /profiles/:id/modify`).

**Branch:** `feat/create-user` → `main`

---

## Changes

### New user creation

- **`/admin/settings/new-user`** — dedicated page: name, email, password, role, company (from API).
- **`/admin/settings`** — “New User” links to the page; inline create form removed.
- **BFF:** `POST /api/pa/admin/users/create` → `POST /api/admin/users/create`
- **BFF:** `GET /api/pa/admin/companies` → `GET /api/admin/companies` (real company UUIDs in dropdowns).

No manual Supabase User ID field — API creates Auth user + `users_profile`.

### Edit user

- **`/admin/users/[id]`** — Supabase User ID read-only; company select uses API companies (not hardcoded placeholders).
- Saves via **`PATCH /api/pa/admin/users/[id]`** (syncs Supabase Auth + Railway, including **`active`**).

### Modify calculation profile

- **`/admin/profiles/[id]`** — “Modify profile” button → `POST /api/pa/admin/profiles/[id]/modify` → redirect to `/admin/countries/<profile-id>/documents` for re-upload and AI re-analysis.
- **`/countries`** — “Docs” link for `pending_approval` profiles.

### Inactive users cannot sign in

- **`/api/auth/login`** — after Supabase sign-in, checks **`GET /api/me`** (not `/admin/users/:id`, which is admin-only and caused false positives for client users).
- Blocks login when Railway `active` is false or `/api/me` returns deactivated (`403`).
- Error copy on `/login`, `/admin/login`, `/customer/login` for `account_inactive`.

### Auth debug (browser console — Netlify)

- Enable with **`?debug_auth=1`** on any login URL, or Netlify env **`PUBLIC_AUTH_DEBUG=1`**.
- Server writes a short-lived **`pa_auth_debug`** cookie; next page load prints a grouped trace in **DevTools → Console** (passwords/tokens redacted).
- **`AuthLoginDebug.astro`** on login pages; **`Layout.astro`** flushes cookie after successful redirect (e.g. dashboard).

> If auth-debug files are not yet committed, include them in this PR before merge.

---

## Files changed (committed on branch)

| Area | Files |
|------|--------|
| New user | `src/pages/admin/settings/new-user.astro`, `src/pages/api/pa/admin/users/create.ts`, `src/pages/api/pa/admin/companies.ts`, `src/pages/admin/settings.astro` |
| Edit user | `src/pages/admin/users/[id].astro` |
| Modify profile | `src/pages/admin/profiles/[id].astro`, `src/pages/api/pa/admin/profiles/[id]/modify.ts`, `src/pages/countries/index.astro`, `src/styles/pages/admin-profile-detail.css` |
| Login / inactive | `src/pages/api/auth/login.ts`, `src/pages/login.astro`, `src/pages/admin/login.astro`, `src/pages/customer/login.astro` |

**Auth debug (local / include in PR):**

| File | Purpose |
|------|---------|
| `src/lib/auth-login-debug.ts` | Server debug log + cookie |
| `src/scripts/auth-login-debug.client.ts` | Browser `console` output |
| `src/components/AuthLoginDebug.astro` | Banner + script on login pages |
| `src/layouts/Layout.astro` | Flush debug cookie on all pages |
| `src/env.d.ts` | `PUBLIC_AUTH_DEBUG` typing |

---

## Environment variables (Netlify)

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Login |
| `API_BASE_URL` | Railway API (required for `/api/me` active check) |
| `PA_PLAN_API_KEY` | BFF → API (`X-API-Key`) |
| `PUBLIC_AUTH_DEBUG` | Optional `1` — always mirror auth logs to browser console |

**Railway API** must have `SUPABASE_SERVICE_ROLE_KEY` for create/edit user endpoints.

---

## Test plan

### Create user

- [ ] Admin → Settings → New User → submit → user in Supabase Auth + listed under `/admin/users`.
- [ ] Client role without company → validation error.

### Edit user

- [ ] Change name, email, role, company, toggle **Active** off → save → refresh shows persisted values.
- [ ] Supabase Dashboard reflects email/metadata changes.

### Modify profile

- [ ] Open **active** profile → Modify profile → lands on documents upload; profile status `pending_approval`.
- [ ] Non-active profile → button disabled or API error handled.

### Inactive login

- [ ] Set user `active = false` in admin edit → sign in as that user → `account_inactive` message, no session.
- [ ] With `?debug_auth=1`, DevTools shows `/api/me` response in console.

### Regression

- [ ] Admin / customer portal routing still correct (`wrong_portal` when applicable).
- [ ] Profile detail page still loads via `/api/pa/admin/profiles/[id]` proxy.

---

## Deploy order

1. Deploy **PlanAdvisorAPI** (`feat/create-user`) with `SUPABASE_SERVICE_ROLE_KEY`.
2. Deploy **PlanAdvisorFront** with `API_BASE_URL` pointing at the API.
3. Remove `PUBLIC_AUTH_DEBUG` after production debugging.
