## Summary

Reorganizes the **Extracted Rules panel** in AI Analysis step 3 to prioritize the **Label** field over **Confidence**. The label now appears in the rule card header and as an editable field, while confidence has been removed from the form.

**Branch:** `feat/edit-label` → `main`

---

## Changes

### Extracted Rules Panel (`ExtractedRulesPanel.tsx`)

- **Header row changes:**
  - Replaced `confidence` dot/badge with **`label` display** (truncated if long)
  - Added **`direction` badge** (Issued/Received/—) next to the label

- **Form field changes:**
  - Removed **`confidence` dropdown** field entirely
  - Added **`label` text input** as an editable field
  - Reordered fields: **Input key → Label → Direction → Obligation → Operation group → PA transactions/item**
  - Moved **Operation group** lower in the form (after Obligation)

- **Cleanup:**
  - Removed `CONFIDENCE_OPTIONS` constant
  - Removed `confidenceBadge()` helper function
  - Removed `confidence` from `EditableFields` type and `toEditable()`
  - Updated dirty-check logic to exclude confidence
  - Updated PATCH request body to exclude confidence

### CSS Styling (`admin-country-ai-analysis.css`)

- Added `.rule-label-display` styles (flexible, truncated text)
- Added `.rule-direction-badge` styles (pill badge similar to status badges)
- Removed `.rule-confidence-dot` styles

---

## Files changed

| File | Changes |
|------|---------|
| `src/components/admin/ExtractedRulesPanel.tsx` | Header row layout, field order, removed confidence, added label editing |
| `src/styles/pages/admin-country-ai-analysis.css` | New `.rule-label-display` and `.rule-direction-badge` classes |

---

## Test plan

- [ ] Open `/admin/countries/<profile-id>/ai-analysis` with extracted rules
- [ ] Verify rule cards show: **Status badge** | **Input key** | **Label** | **Direction badge**
- [ ] Verify form fields appear in order: Input key, Label, Direction, Obligation, Operation group, PA transactions/item, Source excerpt
- [ ] Edit the **Label** field and click "Update rules" — change persists after refresh
- [ ] Verify no **Confidence** dropdown appears in the form
- [ ] Verify **Direction** badge in header updates when direction field changes

---

## Deploy notes

- No API changes required — works with existing transaction rules endpoints
- No environment variable changes
- No database migrations
