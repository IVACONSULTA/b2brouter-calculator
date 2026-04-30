# Deploying PA Plan Advisor Frontend to Netlify + Supabase Auth

This guide covers:
1. Switching the Astro adapter from Node to Netlify
2. Creating and configuring the `netlify.toml`
3. Setting up the Supabase project for authentication
4. Connecting the GitHub repo to Netlify and setting environment variables
5. Replacing the dummy login with real Supabase `signInWithPassword`

---

## Architecture recap

```
Browser
  │
  ▼
Netlify (Astro SSR via Netlify Functions)
  │ validates JWT
  ▼
Supabase  ──── auth.users (credentials only, no business data)
  │ (on login: JWT returned to Astro server → stored as httpOnly cookie)
  ▼
Railway Backend API  ──── PostgreSQL users_profile (role lookup)
```

Supabase is used **exclusively for login credentials and JWT verification**. Business roles (`admin`, `internal`, `client`) live in the Railway PostgreSQL `users_profile` table, looked up by the backend on each authenticated request.

---

## Part 1 — Switch to the Netlify Adapter

The project currently uses `@astrojs/node`. Netlify requires its own SSR adapter.

### 1.1 Install the Netlify adapter

```bash
npm install @astrojs/netlify
```

### 1.2 Update `astro.config.mjs`

Replace the node adapter with the Netlify adapter:

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';

export default defineConfig({
  output: 'server',
  adapter: netlify(),
});
```

> **Why:** `@astrojs/netlify` automatically converts Astro SSR pages into Netlify Functions. No manual serverless function configuration is needed.

### 1.3 Create `netlify.toml` in the project root

```toml
# netlify.toml
[build]
  publish = "dist"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "22"
```

Commit both changes before deploying.

---

## Part 2 — Set Up the Supabase Project

### 2.1 Create a new Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Choose your organisation, pick a region close to your users (e.g. `eu-west-1` for Europe)
3. Set a strong database password and save it — you will not need it directly for auth but Supabase requires it

### 2.2 Enable Email/Password authentication

1. In the Supabase dashboard go to **Authentication → Providers**
2. Ensure **Email** is enabled
3. Under **Auth → Settings**, configure:
   - **Site URL**: your Netlify domain, e.g. `https://pa-plan-advisor.netlify.app`  
     (update this again after Netlify assigns the URL, or after you add a custom domain)
   - **Redirect URLs**: add `https://pa-plan-advisor.netlify.app/**`
   - Disable "Confirm email" if you want instant access (useful during early testing); re-enable for production

### 2.3 Create your first admin user manually

Do this inside the Supabase dashboard to bootstrap the system before the user management UI is wired up:

1. Go to **Authentication → Users → Add user**
2. Email: `admin@yourdomain.com`
3. Password: a strong password
4. Click **Create user**

> The corresponding `users_profile` row (with `role = 'admin'`) must be created in Railway PostgreSQL separately once the backend is deployed. For now, during frontend-only testing, you can simulate the role by embedding it in Supabase user metadata (see Part 5).

### 2.4 Collect your Supabase credentials

Go to **Project Settings → API**:

| Value | Where to find it |
|---|---|
| `SUPABASE_URL` | "Project URL" field |
| `SUPABASE_ANON_KEY` | "Project API keys → anon / public" |

Keep these — you will paste them into Netlify next.

---

## Part 3 — Deploy to Netlify

### 3.1 Push to GitHub

Make sure your latest changes (adapter swap + `netlify.toml`) are committed and pushed:

```bash
git add astro.config.mjs netlify.toml package.json package-lock.json
git commit -m "chore: switch to Netlify adapter and add netlify.toml"
git push
```

### 3.2 Connect the repo in Netlify

1. Go to [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**
2. Choose **GitHub** and authorise Netlify
3. Select the `b2brouter-calculator` repository
4. Netlify will auto-detect `netlify.toml` — confirm the settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Do **not** click Deploy yet — set environment variables first

### 3.3 Set environment variables in Netlify

Go to **Site configuration → Environment variables → Add variable** and add:

| Variable | Value | Notes |
|---|---|---|
| `SUPABASE_URL` | `https://xxxx.supabase.co` | From Supabase Project Settings → API |
| `SUPABASE_ANON_KEY` | `eyJ...` | Public anon key — safe to expose in SSR |
| `API_BASE_URL` | `https://pa-plan-api.up.railway.app/api` | Backend Railway URL (leave blank for now if backend not yet deployed) |
| `SESSION_SECRET` | Any random 32-char string | Used to sign cookies — generate with `openssl rand -base64 32` |

> `DOC_AGENT_URL` and `SUMMARY_AGENT_URL` are **never** set in Netlify. The frontend never calls the AI agents directly.

### 3.4 Deploy

Click **Deploy site**. Netlify will run `npm run build`, package the SSR functions, and give you a URL like `https://amazing-name-123.netlify.app`.

Go back to Supabase **Auth → Settings → Site URL** and update it to match this Netlify URL.

---

## Part 4 — Replace Dummy Login with Real Supabase Auth

The current dummy auth lives in `src/pages/api/auth/dummy-login.ts`. You will replace it (and related files) with real Supabase `signInWithPassword`.

### 4.1 Update `src/lib/supabase.ts`

No changes needed — it already reads from environment variables:

```ts
// src/lib/supabase.ts  ← already correct
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_ANON_KEY,
);
```

### 4.2 Create the real login endpoint

Replace `src/pages/api/auth/dummy-login.ts` with a new file `src/pages/api/auth/login.ts`:

```ts
// src/pages/api/auth/login.ts
import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const email    = form.get('email')?.toString() ?? '';
  const password = form.get('password')?.toString() ?? '';

  if (!email || !password) {
    return new Response('Missing credentials', { status: 400 });
  }

  // 1. Authenticate with Supabase
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    // Redirect back to login with an error flag
    return redirect('/login?error=invalid_credentials');
  }

  // 2. TODO (post-backend): call Railway API to get role from users_profile
  //    const res  = await fetch(`${import.meta.env.API_BASE_URL}/auth/me`, {
  //      headers: { Authorization: `Bearer ${data.session.access_token}` }
  //    });
  //    const { role, name, company } = await res.json();
  //
  // 3. For now — read role from Supabase user_metadata (set this in Supabase dashboard)
  const userMeta = data.user?.user_metadata ?? {};
  const role     = (userMeta.role as string) ?? 'client';
  const name     = (userMeta.full_name as string) ?? email.split('@')[0];

  // 4. Store as httpOnly session cookie
  const session = JSON.stringify({
    role,
    email: data.user?.email ?? email,
    name,
    supabaseAccessToken: data.session.access_token,
    loggedInAt: new Date().toISOString(),
  });

  cookies.set('session', session, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    maxAge: 60 * 60 * 24, // 24 hours
  });

  // 5. Redirect based on role
  if (role === 'admin') return redirect('/admin/dashboard');
  return redirect('/dashboard');
};
```

### 4.3 Update the logout endpoint

```ts
// src/pages/api/auth/logout.ts
import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  const raw = cookies.get('session')?.value;
  if (raw) {
    try {
      const session = JSON.parse(raw);
      // Invalidate the Supabase token server-side
      if (session.supabaseAccessToken) {
        await supabase.auth.admin.signOut(session.supabaseAccessToken);
      }
    } catch { /* ignore parse errors */ }
  }

  cookies.delete('session', { path: '/' });
  return redirect('/');
};
```

### 4.4 Create the unified login page

Replace or add `src/pages/login.astro` (the spec's preferred unified entry point):

```astro
---
// src/pages/login.astro
import Layout from '../layouts/Layout.astro';
import { getSession } from '../lib/session';

const session = getSession(Astro.cookies);
if (session) {
  return Astro.redirect(session.role === 'admin' ? '/admin/dashboard' : '/dashboard');
}

const error = Astro.url.searchParams.get('error');
const errorMessages: Record<string, string> = {
  invalid_credentials: 'Incorrect email or password.',
  session_expired:     'Your session has expired. Please sign in again.',
};
---

<Layout title="Sign In — PA Plan Advisor">
  <main class="login-page">
    <div class="login-card">
      <div class="login-header">
        <h1>PA Plan Advisor</h1>
        <p>Sign in to your account</p>
      </div>

      {error && (
        <div class="error-banner">{errorMessages[error] ?? 'Sign-in failed.'}</div>
      )}

      <!-- POST to /api/auth/login (real Supabase endpoint) -->
      <form action="/api/auth/login" method="POST" class="login-form">
        <div class="field">
          <label for="email">Email address</label>
          <input type="email" id="email" name="email" required autocomplete="email" />
        </div>

        <div class="field">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" required autocomplete="current-password" />
        </div>

        <button type="submit" class="btn-submit">Sign in</button>
      </form>
    </div>
  </main>
</Layout>
```

### 4.5 Set user role in Supabase user_metadata

Until the Railway backend is deployed, embed the role directly in the Supabase user's metadata so the frontend can read it without calling the backend:

1. Go to **Authentication → Users** in Supabase
2. Click on a user → **Edit user**
3. Under **User Metadata** paste:

```json
{
  "role": "admin",
  "full_name": "Admin User"
}
```

Valid roles: `admin`, `internal`, `client`.

> Once the Railway backend is deployed, remove this metadata workaround and uncomment the `fetch(API_BASE_URL/auth/me)` call in `login.ts` (step 4.2). The backend will be the single source of truth for roles.

### 4.6 Update `src/lib/session.ts`

Add `supabaseAccessToken` to the interface so you can forward it to the backend in future requests:

```ts
// src/lib/session.ts
import type { AstroCookies } from 'astro';

export interface Session {
  role: 'admin' | 'internal' | 'client' | 'customer';
  email: string;
  name: string;
  supabaseAccessToken?: string; // present after real Supabase login
  loggedInAt: string;
}

export function getSession(cookies: AstroCookies): Session | null {
  const raw = cookies.get('session')?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}
```

---

## Part 5 — Final Checklist

### Before deploying to production

- [ ] `astro.config.mjs` uses `@astrojs/netlify` adapter
- [ ] `netlify.toml` exists in project root with `NODE_VERSION = "22"`
- [ ] `SUPABASE_URL` and `SUPABASE_ANON_KEY` set in Netlify environment variables
- [ ] `API_BASE_URL` set in Netlify (once Railway backend is live)
- [ ] `SESSION_SECRET` set in Netlify
- [ ] Supabase **Site URL** matches the Netlify URL
- [ ] At least one admin user created in Supabase with `role: admin` in user metadata
- [ ] `src/pages/api/auth/dummy-login.ts` removed (or kept as dev-only fallback)
- [ ] `src/pages/api/auth/login.ts` created with real `signInWithPassword`
- [ ] All protected pages redirect to `/login` (not `/admin/login`) for unauthenticated users

### Local development (keeping dummy login)

During local dev you can keep both endpoints and use `dummy-login.ts` to bypass Supabase. The `.env` file is gitignored and only used locally:

```env
# .env  (never committed)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
API_BASE_URL=http://localhost:3000/api
SESSION_SECRET=dev-secret-change-in-production
```

---

## Part 6 — Custom Domain (optional)

1. In Netlify: **Domain management → Add a domain**
2. Follow the DNS instructions (add CNAME or A record at your registrar)
3. Netlify provisions a free TLS certificate via Let's Encrypt automatically
4. Go back to Supabase **Auth → Settings** and update **Site URL** and **Redirect URLs** with your custom domain

---

## Summary: files changed to go from dummy → production auth

| File | Change |
|---|---|
| `astro.config.mjs` | Replace `@astrojs/node` with `@astrojs/netlify` |
| `netlify.toml` | Create (see Part 1.3) |
| `src/lib/session.ts` | Add `supabaseAccessToken` field |
| `src/pages/api/auth/login.ts` | Create — real Supabase `signInWithPassword` |
| `src/pages/api/auth/logout.ts` | Update — call `supabase.auth.admin.signOut` |
| `src/pages/login.astro` | Create — unified login page |
| `src/pages/admin/login.astro` | Update redirect to `/login` |
| `src/pages/customer/login.astro` | Update redirect to `/login` |
| `src/pages/api/auth/dummy-login.ts` | Delete in production |
| `.env` (local only) | Fill real Supabase credentials |
| Netlify env vars | Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `API_BASE_URL`, `SESSION_SECRET` |
