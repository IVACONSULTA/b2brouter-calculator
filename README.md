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

---

## Testing

This project uses [Playwright](https://playwright.dev) for end-to-end testing.

### Prerequisites

Ensure Playwright browsers are installed:

```bash
npx playwright install
```

### Running tests

| Command | Description |
|---------|-------------|
| `npm run test:e2e` | Run all tests headlessly |
| `npm run test:e2e:ui` | Open Playwright UI for debugging |
| `npm run test:e2e:headed` | Run tests with visible browser windows |
| `npm run test:e2e:debug` | Run tests in debug mode |
| `npx playwright show-report` | View the HTML test report |

### Test structure

```
e2e/
├── customer/                 # Customer portal tests
│   ├── home.spec.ts         # Landing page tests
│   ├── login.spec.ts        # Login flow tests
│   ├── auth.spec.ts         # Authentication & role-based access tests
│   ├── profiles.spec.ts   # Profile loading and management tests
│   ├── calculator.spec.ts  # Calculator functionality tests
│   ├── ai-summary.spec.ts  # AI summary generation and PDF download tests
│   └── complete-flow.spec.ts # End-to-end user journey tests
└── admin/                    # Admin portal tests
    └── login.spec.ts        # Admin login tests
```

### Running specific tests

```bash
# Run only customer tests
npx playwright test e2e/customer/

# Run a specific test file
npx playwright test e2e/customer/login.spec.ts

# Run in a specific browser
npx playwright test --project=chromium
```

### Test Scenarios Covered

**Authentication Tests (`auth.spec.ts`):**
- Login with wrong portal (non-admin accessing admin)
- Login with wrong credentials (invalid password, non-existent user)
- Successful login and session persistence
- Role-based access (internal vs client capabilities)
- Logout functionality

**Profile Tests (`profiles.spec.ts`):**
- Display available profiles on dashboard
- Profile search functionality
- Profile statistics display
- Navigation to calculator from profiles

**Calculator Tests (`calculator.spec.ts`):**
- Calculator form validation
- Transaction volume inputs
- Form reset functionality
- Demo mode calculation
- Results panel display

**AI Summary & PDF Tests (`ai-summary.spec.ts`):**
- AI summary section display
- Generate summary button visibility
- PDF download functionality
- Copy summary to clipboard
- Scenario list and detail navigation

**Complete User Flows (`complete-flow.spec.ts`):**
- End-to-end happy path journey
- Error handling flows
- Breadcrumb and sidebar navigation
- Data persistence across pages

### Test Status Notes

- Tests gracefully skip when **demo mode is not enabled** (no valid demo credentials available)
- Tests use flexible selectors to handle both old and new UI layouts
- Helper functions in `e2e/customer/helpers.ts` provide reusable authentication flows
- Screenshots are captured on test failures for debugging

### Configuration

Playwright configuration is in `playwright.config.ts`:
- Base URL: `http://localhost:4321`
- Browsers: Chromium, Firefox, WebKit
- Mobile viewports: Pixel 5, iPhone 12
- Auto-starts Astro dev server before tests
- Screenshot on failure enabled
- HTML test reports generated
