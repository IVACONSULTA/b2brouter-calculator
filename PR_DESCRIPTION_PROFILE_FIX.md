# Fix: Profile Detail Page Loading Error

## Summary
Fixed the profile detail page (`/admin/profiles/[id]`) that was failing to load with a CORS/iframe error when navigating from the profile list.

## Problem
The profile page was making direct server-side API calls to the backend using `paFetchJson`, which caused authentication/CORS issues in production. The browser console showed:
```
Unsafe attempt to load URL https://pricingwizard.platformvat.com/admin/profiles/...
```

## Solution

### 1. Created API Proxy Route
**File:** `src/pages/api/pa/admin/profiles/[id].ts`

New secure proxy endpoint that:
- Handles authentication server-side with fresh Supabase tokens
- Proxies requests to `/admin/profiles/:id` backend endpoint
- Keeps `PA_PLAN_API_KEY` secure (never exposed to client)
- Returns proper HTTP status codes and error responses

### 2. Updated Profile Detail Page
**File:** `src/pages/admin/profiles/[id].astro`

Changed from direct backend API calls to using the local proxy:
- Now fetches from `/api/pa/admin/profiles/${id}` (same origin)
- Transforms backend response to match frontend type structure
- Added proper try-catch error handling with user-friendly messages
- Fixed `canActivate` calculation (removed unnecessary null check)

## Pattern Consistency
This fix applies the same proxy pattern already working successfully for:
- `/admin/analyses/[id]` (document analysis detail)
- `/api/pa/admin/rules` (transaction rules)
- `/api/pa/admin/users/[id]` (user edit)

## Testing
1. Navigate to `/admin/profiles` (profile list)
2. Click on any profile
3. Profile detail page should load successfully showing:
   - Country/Provider header
   - Activation requirements checklist
   - Approved rules, plans, and assumptions

## Files Changed
- `src/pages/api/pa/admin/profiles/[id].ts` (new)
- `src/pages/admin/profiles/[id].astro` (updated)
