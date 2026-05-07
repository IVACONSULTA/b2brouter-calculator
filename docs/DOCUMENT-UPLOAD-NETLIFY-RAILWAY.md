# Testing & debugging document upload (Netlify frontend + Railway API)

This guide describes how admin document upload works when the **Plan Advisor frontend** runs on **Netlify** (Astro SSR / serverless) and **PlanAdvisorAPI**, **PostgreSQL**, and **file storage** run on **Railway**.

---

## 1. Architecture (happy path)

```
Browser (admin, signed in)
  │
  ▼
POST /api/pa/admin/documents/upload   ← Netlify Function (Astro BFF)
  │ reads httpOnly cookies → refreshes Supabase access token
  │ forwards multipart to Railway with Authorization: Bearer <JWT>
  ▼
Railway PlanAdvisorAPI
  POST /api/admin/documents/upload-staging   (wizard draft — no profile UUID yet)
  or
  POST /api/admin/documents/upload           (live — linked to calculation_profiles)
  │
  ▼
PostgreSQL (metadata) + Volume or S3-compatible storage (bytes)
```

- **Staging / draft**: rows in `document_staging`, objects under storage prefix `staging__{slug}/` (slug derived from the wizard profile id, e.g. `profile-it-pdp-1`).
- **Live**: rows in `documents`, objects under the real `calculation_profiles.id` folder/key.

Listing on **Documents (step 2)**:

- If the UI resolves a matching **`calculation_profiles`** row → **`GET /api/admin/documents?profile_id=...`**
- Otherwise (still in wizard, no UUID match) → **`GET /api/admin/documents/staging?profile_slug=...`**

---

## 2. Prerequisites on Railway

### 2.1 Database

Create the **`document_staging`** table on your Railway Postgres (staging uploads/list routes fail with **`42P01`** until this exists).

**Quickest fix:** run the migration script once:

- File in repo: **`PlanAdvisorAPI/db/migrations/001_document_staging.sql`**

From your laptop (with `DATABASE_URL` from Railway copied into your shell):

```bash
psql "$DATABASE_URL" -f PlanAdvisorAPI/db/migrations/001_document_staging.sql
```

Or paste the contents of that file into Railway → PostgreSQL → **Query** / **Data** SQL runner.

The full canonical DDL also lives in **`PlanAdvisorAPI/db/schema.sql`** (section **document_staging**).

### 2.2 Storage

- **Filesystem / Railway Volume**: ensure **`DOCUMENTS_PATH`** (default `/data/documents`) exists and is writable by the API process.
- **S3-compatible**: configure **`STORAGE_DRIVER`**, bucket, and credentials per `PlanAdvisorAPI/lib/storage.js`. Staging uses the same helpers as live uploads.

### 2.3 API ↔ browser

- **`FRONTEND_URL`** on Railway should include your Netlify site origin (CORS + cookies behavior).
- **`PA_PLAN_API_KEY`** (optional): if set on the API, the Netlify BFF should send the same value as **`X-API-Key`** (already wired via **`PA_PLAN_API_KEY`** on the frontend build env).

---

## 3. Environment variables

### 3.1 Netlify (frontend / BFF)

| Variable | Purpose |
|----------|---------|
| **`API_BASE_URL`** | Railway API base **without** trailing `/api` (e.g. `https://your-service.up.railway.app`). Required for SSR profile resolution and uploads. |
| **`PA_PLAN_API_KEY`** | Must match Railway if the API enforces `X-API-Key`. |
| **`PUBLIC_PA_UPLOAD_DEBUG`** | Set to **`1`** at **build time**, then redeploy — enables **`[PA upload]`** logs in **Netlify Functions** logs and anywhere server code uses `paUploadLog`. |
| **`PUBLIC_PA_UI_PROFILE_UUID_MAP`** | Optional JSON map from wizard slug → **`calculation_profiles.id`** UUID when dummy UI rows don’t match Railway `country_code` / `provider_name` / `version`. Example: `{"profile-it-pdp-1":"<uuid>"}`. |
| **`PLAN_ADVISOR_STAGING_DOCUMENT_ROOT`** | Used by the AI analysis BFF when building absolute paths for **Railway-staged** files (default **`/data/documents`**). Only relevant if Crew reads the **same** paths as the API volume. |
| **`PLAN_ADVISOR_CREW_URL`** | Crew / AgenteDocumental **`POST /analyze`** URL (optional for upload itself). |

**Important:** `PUBLIC_*` variables are inlined at **build time**. After changing them in Netlify, trigger a **new deploy**.

### 3.2 Railway (API)

| Variable | Purpose |
|----------|---------|
| **`DATABASE_URL`** | PostgreSQL connection string. |
| **`SUPABASE_URL`** / **`SUPABASE_ANON_KEY`** | JWT verification for admin routes. |
| **`DOCUMENTS_PATH`** | Root for file storage on volume (if using filesystem). |
| **`PA_UPLOAD_DEBUG`** | Set to **`1`** for extra **`[PA upload API]`** logs on multipart handlers. |
| S3-related vars | As needed when not using the volume. |

---

## 4. Upload modes (what the UI does)

| Situation | Mode | Form field | Railway endpoint |
|-----------|------|------------|-------------------|
| **`PA_LOCAL_DOCUMENT_STORAGE=1`** on Netlify build | Local | (no Railway ids) | Writes under repo `docs/uploads/` — **not for production Netlify**. |
| Signed in + **`API_BASE_URL`**, **no** resolved profile UUID | **Staging** | `upload_mode=staging` | **`POST /api/admin/documents/upload-staging`** |
| Resolved **`apiTarget`** (country / provider / profile UUIDs) | **Live** | `country_id`, `provider_id`, `profile_id` | **`POST /api/admin/documents/upload`** |

---

## 5. Manual test checklist

### 5.1 Admin session

1. Sign in as **admin** on the Netlify site (Supabase session + cookies).
2. Open browser DevTools → **Network**.
3. Go to **Countries → pick profile → Documents (step 2)**.

### 5.2 Staging upload (wizard, no Plan Advisor profile match)

1. Confirm the page notice explains **temporary / draft** storage (staging).
2. Upload a small PDF (≤ a few MB), choose a **document type**, submit.
3. Expect **`POST /api/pa/admin/documents/upload`** → **201** from your Netlify origin (check response JSON; staging responses may include **`staged: true`** from the BFF).
4. Reload the page: the file should appear in the table (data from **`GET .../documents/staging`**).

### 5.3 Live upload (profile resolved)

1. Ensure **`calculation_profiles`** exists and matches the dummy profile’s country / provider / version, **or** set **`PUBLIC_PA_UI_PROFILE_UUID_MAP`** for that slug, then **redeploy**.
2. Upload again: form should send **`country_id`**, **`provider_id`**, **`profile_id`** (no **`upload_mode=staging`**).
3. Confirm **`GET /api/admin/documents?profile_id=...`** lists the file.

### 5.4 Promote on activation (step 4)

When calling **`POST /api/admin/profiles/:id/activate`**, send JSON including:

```json
{
  "promote_profile_slug": "profile-it-pdp-1"
}
```

(use the **same** wizard slug as in the URL `/admin/countries/profile-it-pdp-1/documents`).

- Success: response includes **`promoted_documents`** (may be empty if nothing was staged).
- Failure after activate: API may return **500** with a message about promotion; profile might already be **active**. Retry **`POST /api/admin/documents/promote-staging`** with body:

```json
{
  "profile_slug": "profile-it-pdp-1",
  "country_id": "<uuid>",
  "provider_id": "<uuid>",
  "profile_id": "<calculation_profiles.uuid>"
}
```

---

## 6. Debugging

### 6.1 Browser (no redeploy)

1. Open Documents page with query: **`?pa_upload_debug=1`**
2. DevTools → **Console**: filter for **`[PA upload]`** — you should see **`DocumentUploadPanel props`** (`uploadMode`, ids, `canUpload`) and upload submit/response logs.

### 6.2 Netlify Functions logs

1. Netlify dashboard → your site → **Functions** / **Logs**.
2. Enable **`PUBLIC_PA_UPLOAD_DEBUG=1`**, **redeploy**, reproduce upload.
3. Look for **`[PA upload]`** lines from **`documents` SSR** (profile resolution) and **`api/pa/admin/documents/upload`** (BFF forwarding).

### 6.3 Railway logs

1. Service logs for PlanAdvisorAPI.
2. Set **`PA_UPLOAD_DEBUG=1`** for **`[PA upload API]`** traces on multipart upload routes.
3. Watch for **401/403** (JWT / role), **400** (validation), **500** (DB/storage).

### 6.4 Isolate Railway without Netlify

Use an admin JWT from Supabase (same audience as production) and call Railway directly:

```bash
export API="https://YOUR-RAILWAY-APP.up.railway.app"
export TOKEN="eyJ..."   # Supabase access token for an admin user
export KEY="your-pa-plan-api-key-if-used"

curl -sS "$API/api/admin/documents/staging?profile_slug=profile-it-pdp-1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-API-Key: $KEY"
```

Multipart staging upload via curl:

```bash
curl -sS -X POST "$API/api/admin/documents/upload-staging" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-API-Key: $KEY" \
  -F "file=@./sample.pdf" \
  -F "profile_slug=profile-it-pdp-1" \
  -F "document_type=provider_pricing"
```

If direct Railway calls work but Netlify fails, the issue is usually **cookies**, **`API_BASE_URL`**, or **`PA_PLAN_API_KEY`** mismatch.

---

## 7. Common issues

| Symptom | Things to check |
|---------|------------------|
| **Upload unavailable** / empty UUID props | **`API_BASE_URL`** missing on Netlify build; not signed in; **`PUBLIC_PA_UPLOAD_DEBUG`** + SSR logs for **`apiTarget`** null vs **`canUpload`**. |
| **403** on BFF | Session not admin; cookie domain / SameSite on Netlify. |
| **401** on BFF | Supabase refresh failed — sign in again. |
| **502 / failed fetch** to Railway | Wrong **`API_BASE_URL`**, Railway asleep (free tier), or network block. |
| Staging **500** | **`document_staging`** table missing; volume not writable; S3 misconfiguration. |
| Live upload **400** “No calculation_profiles row matches…” | UUIDs don’t match DB; fix data or use **`PUBLIC_PA_UI_PROFILE_UUID_MAP`**. |
| AI analysis “No documents” | Local **`docs/uploads`** empty **and** no staged rows **or** Crew URL doesn’t see **`PLAN_ADVISOR_STAGING_DOCUMENT_ROOT`** paths (different host/volume). |

---

## 8. Related code (repo map)

| Area | Location |
|------|----------|
| Documents page SSR / listing | `src/pages/admin/countries/[id]/documents.astro` |
| Upload BFF | `src/pages/api/pa/admin/documents/upload.ts` |
| Upload UI | `src/components/admin/DocumentUploadPanel.tsx` |
| Debug helpers | `src/lib/pa-upload-debug.ts` |
| Slug → UUID override | `src/lib/pa-ui-profile-uuid-map.ts` |
| Profile resolution | `src/lib/admin-resolve-profile-api.ts` |
| AI paths fallback | `src/pages/api/pa/admin/ai-analysis/chat.ts` |
| Railway routes | `PlanAdvisorAPI/routes/documents.js`, `PlanAdvisorAPI/lib/document-staging.js` |
| Schema | `PlanAdvisorAPI/db/schema.sql` |

---

## 9. Security note

Debug flags and slug maps can expose internal ids and noisy logs. Disable **`PUBLIC_PA_UPLOAD_DEBUG`** and trim **`PUBLIC_PA_UI_PROFILE_UUID_MAP`** once troubleshooting is done, and avoid logging JWTs or API keys anywhere.
