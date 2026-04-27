# B2B Router Calculator

A server-rendered web app built with [Astro](https://astro.build) that provides two role-based portals — **Admin** and **Customer** — each protected by authentication via [Supabase](https://supabase.com).

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Astro 6 (SSR, `output: 'server'`) |
| Adapter | `@astrojs/node` (standalone mode) |
| Auth | Supabase (`@supabase/supabase-js`) — dummy mode active |
| Styling | Scoped CSS inside `.astro` files |
| Session | Server-side `httpOnly` cookie |

---

## Project structure

```
src/
├── layouts/
│   └── Layout.astro          # Shared HTML shell and global CSS variables
├── lib/
│   ├── supabase.ts            # Supabase client initialisation
│   └── session.ts             # Read/parse the session cookie
└── pages/
    ├── index.astro            # Landing page — choose Admin or Customer portal
    ├── admin/
    │   ├── login.astro        # Admin login page
    │   └── dashboard.astro    # Protected admin dashboard
    ├── customer/
    │   ├── login.astro        # Customer login page
    │   └── dashboard.astro    # Protected customer dashboard
    └── api/auth/
        ├── dummy-login.ts     # Sets a session cookie and redirects by role
        └── logout.ts          # Clears the session cookie and redirects to /
```

---

## Running locally

### Prerequisites

- Node.js 18+
- npm 9+

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env` and fill in your Supabase project credentials (or leave the placeholders for dummy-auth mode):

```bash
cp .env .env.local
```

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### 3. Start the dev server

```bash
npm run dev
```

The app will be available at **http://localhost:4321**.

### 4. Build for production

```bash
npm run build
npm run preview   # preview the production build locally
```

---

## Authentication

### Current state — dummy mode

Authentication is bypassed for development. Clicking the sign-in button on either login page calls `POST /api/auth/dummy-login`, which:

1. Reads the `role` field from the form (`admin` or `customer`)
2. Writes a JSON `httpOnly` session cookie valid for 24 hours
3. Redirects to the corresponding dashboard

### Switching to real Supabase auth

1. Add valid credentials to `.env`
2. Replace the body of `src/pages/api/auth/dummy-login.ts` with a call to `supabase.auth.signInWithPassword()`
3. Store the Supabase `access_token` (or user object) in the session cookie instead of the dummy payload
4. Update `src/lib/session.ts` to verify the token with Supabase if needed

---

## Pages and routes

| Route | Access | Description |
|---|---|---|
| `/` | Public | Landing page — portal selection |
| `/admin/login` | Public | Admin login form |
| `/admin/dashboard` | Admin only | Admin overview, routes, stats |
| `/customer/login` | Public | Customer login form |
| `/customer/dashboard` | Customer only | Customer routes, billing, invoices |
| `POST /api/auth/dummy-login` | Public | Issues a session cookie |
| `POST /api/auth/logout` | Any | Deletes the session cookie |
