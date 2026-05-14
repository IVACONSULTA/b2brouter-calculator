import { DUMMY_PROFILES } from './dummy-data';

export type AdminWizardProfile = (typeof DUMMY_PROFILES)[number];

/**
 * SSR-safe profile row for admin wizard URLs: known dummy ids, a stable placeholder for new drafts,
 * or a placeholder for real profile IDs (the actual data is hydrated client-side from sessionStorage).
 */
export function resolveAdminWizardProfile(routeProfileId: string): AdminWizardProfile {
  const found = DUMMY_PROFILES.find((p) => p.id === routeProfileId);
  if (found) return found;

  if (routeProfileId.startsWith('profile-draft-')) {
    return {
      id: routeProfileId,
      country: { code: '…', name: 'New draft profile' },
      provider: { name: '…', type: 'PA' },
      version: 'v1.0',
      currency: 'EUR',
      status: 'draft',
      active_from: null,
      created_at: new Date().toISOString().slice(0, 10),
      rules_count: 0,
      plans_count: 0,
      analysis_id: null,
    };
  }

  // For real profile IDs (UUIDs from the database), return a placeholder that uses the route ID.
  // The actual profile data (country, provider, etc.) will be hydrated client-side from sessionStorage
  // by the WizardCountryDraftIsland component.
  return {
    id: routeProfileId,
    country: { code: '…', name: 'Profile' },
    provider: { name: '…', type: 'PA' },
    version: 'v1.0',
    currency: 'EUR',
    status: 'draft',
    active_from: null,
    created_at: new Date().toISOString().slice(0, 10),
    rules_count: 0,
    plans_count: 0,
    analysis_id: null,
  };
}
