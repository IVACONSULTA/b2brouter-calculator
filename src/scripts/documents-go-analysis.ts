import { loadCountryWizardDraft } from '../lib/country-wizard-draft';

/**
 * Step 2 → Step 3: Run document analysis (async) and navigate to AI analysis page.
 *
 * Flow:
 *   1. Disable button and show "Analyzing documents…"
 *   2. POST /api/pa/admin/wizard/run-analysis → API kicks off agent in background,
 *      returns 202 immediately with `analysis_id` (well under any function timeout).
 *   3. Poll GET /api/pa/admin/wizard/analysis-status?analysis_id=… every 3s until
 *      status === 'completed' (navigate to ai-analysis page) or 'failed' (show alert).
 *   4. On network/HTTP error, show alert and re-enable button.
 */

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const POLL_MAX_CONSECUTIVE_ERRORS = 5;

type AnalysisStatusResponse = {
  analysis_id?: string;
  status?: 'running' | 'completed' | 'failed' | 'pending_review';
  error_message?: string | null;
  rules_proposed?: number;
  plans_proposed?: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollAnalysisStatus(analysisId: string): Promise<AnalysisStatusResponse> {
  const startedAt = Date.now();
  let consecutiveErrors = 0;

  while (Date.now() - startedAt < POLL_MAX_DURATION_MS) {
    await sleep(POLL_INTERVAL_MS);

    try {
      const res = await fetch(
        `/api/pa/admin/wizard/analysis-status?analysis_id=${encodeURIComponent(analysisId)}`,
        { credentials: 'same-origin' },
      );

      if (!res.ok) {
        consecutiveErrors += 1;
        if (consecutiveErrors >= POLL_MAX_CONSECUTIVE_ERRORS) {
          throw new Error(`Status endpoint returned ${res.status} repeatedly.`);
        }
        continue;
      }

      consecutiveErrors = 0;
      const data = (await res.json().catch(() => ({}))) as AnalysisStatusResponse;

      if (data.status === 'completed' || data.status === 'failed') {
        return data;
      }
      // Still running — loop and poll again.
    } catch (err) {
      consecutiveErrors += 1;
      if (consecutiveErrors >= POLL_MAX_CONSECUTIVE_ERRORS) {
        throw err;
      }
    }
  }

  throw new Error(
    `Analysis did not complete within ${POLL_MAX_DURATION_MS / 60000} minutes. ` +
      `It may still be running — refresh the AI analysis page later.`,
  );
}

export function initDocumentsGoAnalysis(): void {
  const btn = document.getElementById('btn-go-analysis');
  if (!(btn instanceof HTMLButtonElement)) return;

  const originalText = btn.innerHTML;

  const setAnalyzingState = (label: string) => {
    btn.disabled = true;
    btn.innerHTML = `
      <span class="animate-pulse">${label}</span>
      <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
    `;
  };

  const restoreButton = () => {
    btn.disabled = false;
    btn.innerHTML = originalText;
  };

  btn.addEventListener('click', async () => {
    const href = btn.dataset.href ?? '';
    const slug = btn.dataset.profileSlug ?? '';

    if (!href || !slug) {
      alert('Missing navigation target.');
      return;
    }

    let profileId = btn.dataset.profileId ?? '';
    let countryId = btn.dataset.countryId ?? '';
    let providerId = btn.dataset.providerId ?? '';

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

    setAnalyzingState('Starting analysis');

    let analysisId: string;
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
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        analysis_id?: string;
      };

      if (!res.ok || !data.analysis_id) {
        restoreButton();
        const msg =
          typeof data.error === 'string'
            ? data.error
            : typeof data.message === 'string'
              ? data.message
              : JSON.stringify(data);
        alert(msg || `Failed to start analysis (${res.status}).`);
        return;
      }

      analysisId = data.analysis_id;
      console.log('[Go to Analysis] Analysis kicked off:', { analysis_id: analysisId });
    } catch (err) {
      restoreButton();
      const message = err instanceof Error ? err.message : 'Network error';
      alert(`Failed to start analysis: ${message}`);
      return;
    }

    setAnalyzingState('Analyzing documents');

    try {
      const final = await pollAnalysisStatus(analysisId);

      if (final.status === 'failed') {
        restoreButton();
        alert(
          `Analysis failed: ${final.error_message || 'Unknown error from the document agent.'}`,
        );
        return;
      }

      console.log('[Go to Analysis] Analysis completed:', {
        analysis_id: final.analysis_id,
        rules_proposed: final.rules_proposed,
        plans_proposed: final.plans_proposed,
      });

      window.location.href = href;
    } catch (err) {
      restoreButton();
      const message = err instanceof Error ? err.message : 'Network error';
      alert(`Analysis status check failed: ${message}`);
    }
  });
}
