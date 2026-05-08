/**
 * Step 2 → Step 3: promote staged docs + run Plan Advisor analysis pipeline before navigation.
 */
export function initDocumentsGoAnalysis(): void {
  const btn = document.getElementById('btn-go-analysis');
  if (!(btn instanceof HTMLButtonElement)) return;

  btn.addEventListener('click', async () => {
    const href = btn.dataset.href ?? '';
    const slug = btn.dataset.profileSlug ?? '';
    const profileId = btn.dataset.profileId ?? '';
    const countryId = btn.dataset.countryId ?? '';
    const providerId = btn.dataset.providerId ?? '';

    if (!href || !slug) {
      alert('Missing navigation target.');
      return;
    }

    if (!profileId || !countryId || !providerId) {
      alert(
        'Plan Advisor profile UUIDs are missing for this wizard profile. Set PUBLIC_PA_UI_PROFILE_UUID_MAP on Netlify (slug → calculation_profiles.id) or ensure the dummy country/provider/version matches a draft profile in the API.',
      );
      return;
    }

    btn.disabled = true;
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
      };
      if (!res.ok) {
        const msg =
          typeof data.error === 'string'
            ? data.error
            : typeof data.message === 'string'
              ? data.message
              : JSON.stringify(data);
        alert(msg || `Analysis failed (${res.status})`);
        return;
      }
      window.location.href = href;
    } finally {
      btn.disabled = false;
    }
  });
}
