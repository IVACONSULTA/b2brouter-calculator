## 📝 Description

This PR implements the complete admin interaction workflow for the PlanAdvisor platform, enabling administrators to create, configure, and manage country/provider calculation profiles through an intuitive multi-step wizard with AI-powered document analysis.

## 🎯 What does this PR do?

- [x] Feature addition
- [ ] Bug fix
- [x] Documentation update
- [ ] Code refactoring
- [ ] Other: ____________

## 🔍 Changes Made

### 🎛️ Admin Calculator (`AdminCalculatorIsland`)
- New interactive calculator component for administrators to simulate transaction scenarios
- Real-time calculation of PA transactions based on editable transaction rules
- Plan recommendation engine showing optimal plans based on projected usage
- Support for multiple currencies (EUR, GBP, PLN, RON)
- Integration with backend API for fetching profile rules and plans

### 📄 Document Upload System (`DocumentUploadPanel`)
- Multi-document upload interface supporting PDF, DOCX, XLSX, CSV, TXT, MD formats
- Pre-upload copyright compliance checking (451 status handling)
- Automatic storage path generation for new country profiles
- Support for local development mode with filesystem storage
- Live mode with direct-to-API upload for production
- Document type categorization and metadata management

### 🤖 AI Analysis Workflow
- End-to-end AI-powered document analysis for extracting transaction rules
- New `ai-analysis.astro` page with integrated chat interface for agent interaction
- Real-time job status polling for asynchronous analysis processing
- `ExtractedRulesPanel` component for viewing and editing AI-extracted rules
- Editable transaction rules with confidence scoring (high/medium/low)
- Source excerpt preservation linking rules back to source documents
- Rule approval/rejection workflow with status tracking

### 📋 Plans Management (`PlansManagerPanel`)
- Full CRUD interface for managing provider pricing plans
- Plan approval workflow (draft → proposed → approved)
- Support for annual/monthly fee structures with extra transaction costs
- Inline editing with optimistic UI updates
- Confidence scoring for AI-generated plan recommendations

### 🧙 Country/Provider Wizard
- Multi-step wizard for creating new country/provider profiles
- Draft persistence using `country-wizard-draft` context
- Step 1: Country & Provider selection with temporary profile creation
- Step 2: Document upload with copyright checking
- Step 3: AI analysis with rule extraction and editing
- Step 4: Plan activation with approval workflow
- Automatic profile ID resolution for admin paths

### 📤 PDF Export Functionality
- New API endpoint `/api/pa/scenarios/[id]/export-pdf` for generating PDF reports
- Client-side PDF generation for scenario summaries

### 🔐 Authentication & Security
- Sign out functionality implementation (`logout.ts`)
- Copyright-restricted documents are blocked before backend transmission
- Supabase JWT integration for secure API communication

### 📦 API Endpoints Added
- `POST /api/pa/admin/ai-analysis/chat` - Initiate AI analysis chat
- `GET /api/pa/admin/ai-analysis/chat/jobs/[job_id]` - Poll analysis job status
- `POST /api/pa/admin/documents/copyright-check` - Pre-upload copyright check
- `POST /api/pa/admin/documents/upload` - Document upload handler
- `POST /api/pa/admin/documents/delete` - Document deletion
- `GET /api/pa/admin/profiles/[id]` - Fetch profile with rules & plans
- `POST /api/pa/admin/profiles/create` - Create new calculation profile
- `POST /api/pa/admin/profiles/delete` - Delete inactive profiles
- `PATCH /api/pa/admin/plans/[id]` - Update plan details
- `GET /api/pa/admin/plans` - List profile plans
- `PATCH /api/pa/admin/rules/[id]` - Update transaction rule
- `POST /api/pa/admin/wizard/run-analysis` - Trigger document analysis
- `GET /api/pa/admin/wizard/analysis-status` - Check analysis status
- `POST /api/pa/admin/wizard/approve-analysis` - Approve extracted rules
- `GET /api/pa/countries` - List available countries
- `GET /api/pa/providers` - List available providers

### 📚 Documentation
- Added `docs/DOCUMENT-UPLOAD-NETLIFY-RAILWAY.md` with deployment configuration guide
- Netlify configuration for large file uploads (`netlify.toml`)

### 🎨 UI/UX Improvements
- New CSS stylesheets for admin pages (`admin-calculator.css`, `admin-country-ai-analysis.css`, `admin-country-activate.css`)
- Responsive layouts for all new admin interfaces
- Loading states and error handling throughout
- Breadcrumb navigation updates in AdminLayout

## 🧪 Testing

- [x] I have tested this locally
- [x] All tests pass
- [x] No breaking changes (backward compatible with existing profiles)

## 📸 Screenshots (if applicable)

<!-- Screenshots should be added for:
- Admin Calculator interface
- Document upload panel with copyright check
- AI analysis chat interface
- Transaction rules editing panel
- Plans management interface
- Country wizard steps
-->

## 📋 Checklist

- [x] Code follows project style guidelines
- [x] Self-review completed
- [x] Code is commented where necessary
- [x] Documentation updated (deployment docs added)

## 🚀 Deployment Notes

### Environment Variables Required
Ensure these environment variables are set in production:

```bash
# Supabase (existing)
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=

# PlanAdvisor API (existing)
API_BASE_URL=

# New for document uploads
PUBLIC_UPLOADS_DIR=./data/uploads  # For local dev
```

### Netlify Configuration
The `netlify.toml` is included with:
- 50MB body size limit for document uploads
- 60s function timeout for AI analysis operations

### Database Requirements
This PR requires the following backend tables (via PlanAdvisorAPI):
- `calculation_profiles` - Profile storage
- `document_analysis_jobs` - AI analysis job tracking
- `uploaded_documents` - Document metadata
- `transaction_rules` - Extracted and manual rules
- `plans` - Provider pricing plans

## 📞 Additional Notes

### Known Limitations
- AI analysis timeout set to 5 minutes maximum
- Document upload limited to 50MB per file
- Copyright checking uses pattern matching (may require manual review for edge cases)

### Migration Notes
- Existing profiles continue to work without changes
- Admin paths now use real UUIDs instead of slugs for security
- Old static routes are resolved via `admin-resolve-profile-api.ts`

### Future Enhancements
- Batch document analysis
- Advanced rule templating
- Multi-country plan comparison
- Audit logging for admin actions
