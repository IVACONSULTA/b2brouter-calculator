import { loadCountryWizardDraft } from '../lib/country-wizard-draft';

/**
 * Step 2 → Step 3: Run document analysis and navigate to AI analysis page.
 *
 * Flow:
 *   1. Disable button and show "Analyzing documents..."
 *   2. Call API to run analysis (includes DOCUMENT_ANALYSIS_MESSAGE from env)
 *   3. On success, navigate to /admin/countries/<profile-id>/ai-analysis
 *   4. On error, show alert and re-enable button
 */
export function initDocumentsGoAnalysis(): void {
  const btn = document.getElementById('btn-go-analysis');
  if (!(btn instanceof HTMLButtonElement)) return;

  // Store original button text for restoration on error
  const originalText = btn.innerHTML;

  btn.addEventListener('click', async () => {
    const href = btn.dataset.href ?? '';
    const slug = btn.dataset.profileSlug ?? '';

    if (!href || !slug) {
      alert('Missing navigation target.');
      return;
    }

    // Read from button data attributes (set by React island after hydration)
    let profileId = btn.dataset.profileId ?? '';
    let countryId = btn.dataset.countryId ?? '';
    let providerId = btn.dataset.providerId ?? '';

    // Fallback: read directly from sessionStorage if React hasn't hydrated yet
    if (!profileId || !countryId || !providerId) {
      const draft = loadCountryWizardDraft(slug);
      console.log('[Go to Analysis] Draft from sessionStorage:', {
        slug,
        hasApiProfileId: Boolean(draft?.apiProfileId),
        hasApiCountryId: Boolean(draft?.apiCountryId),
        hasApiProviderId: Boolean(draft?.apiProviderId),
      });
      if (draft?.apiProfileId && draft?.apiCountryId && draft?.apiProviderId) {
        profileId = draft.apiProfileId;
        countryId = draft.apiCountryId;
        providerId = draft.apiProviderId;
      }
    }

    if (!profileId || !countryId || !providerId) {
      alert(
        'Plan Advisor profile UUIDs are missing for this wizard profile. Set PUBLIC_PA_UI_PROFILE_UUID_MAP on Netlify (slug → calculation_profiles.id) or ensure the dummy country/provider/version matches a draft profile in the API.',
      );
      return;
    }

    // Disable button and show analyzing state
    btn.disabled = true;
    btn.innerHTML = `
      <span class="animate-pulse">Analyzing documents</span>
      <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
    `;

    try {
      const res = await fetch('/api/pa/admin/wizard/run-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          profile_slug: slug,
          calculation_profile_id: profileId,
          country_id: countryId,
          provider_id: providerId,
          // message is injected server-side from DOCUMENT_ANALYSIS_MESSAGE env var
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        analysis_id?: string;
        rules_proposed?: number;
        plans_proposed?: number;
      };

      if (!res.ok) {
        // Restore button state on error
        btn.disabled = false;
        btn.innerHTML = originalText;

        const msg =
          typeof data.error === 'string'
            ? data.error
            : typeof data.message === 'string'
              ? data.message
              : JSON.stringify(data);
        alert(msg || `Analysis failed (${res.status})`);
        return;
      }

      console.log('[Go to Analysis] Analysis completed:', {
        analysis_id: data.analysis_id,
        rules_proposed: data.rules_proposed,
        plans_proposed: data.plans_proposed,
      });

      // Navigate to AI analysis page on success
      // The page will fetch and display the transaction_rules
      window.location.href = href;
    } catch (err) {
      // Restore button state on network error
      btn.disabled = false;
      btn.innerHTML = originalText;

      const message = err instanceof Error ? err.message : 'Network error';
      alert(`Failed to start analysis: ${message}`);
    }
  });
}
