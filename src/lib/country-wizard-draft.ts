/**
 * Persists "New country" wizard data across step navigations (multi-page Astro routes).
 * React Context alone cannot span full document navigations; sessionStorage does.
 */

export type CountryWizardDraft = {
  profileRouteId: string;
  countryCode: string;
  countryName: string;
  providerName: string;
  providerType: 'PA' | 'PDP' | 'other';
  currency: string;
  version: string;
  calculationBasis: string;
  notes: string;
  savedAt: string;
};

const STORAGE_PREFIX = 'pa_country_wizard_draft:';

export function draftStorageKey(profileRouteId: string): string {
  return `${STORAGE_PREFIX}${profileRouteId}`;
}

export function isDraftProfileRouteId(routeProfileId: string): boolean {
  return routeProfileId.startsWith('profile-draft-');
}

export function makeDraftProfileRouteId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `profile-draft-${crypto.randomUUID()}`;
  }
  return `profile-draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function saveCountryWizardDraft(draft: CountryWizardDraft): void {
  try {
    sessionStorage.setItem(draftStorageKey(draft.profileRouteId), JSON.stringify(draft));
  } catch {
    /* quota / private mode */
  }
}

export function loadCountryWizardDraft(profileRouteId: string): CountryWizardDraft | null {
  try {
    const raw = sessionStorage.getItem(draftStorageKey(profileRouteId));
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<CountryWizardDraft>;
    if (!o || typeof o !== 'object' || o.profileRouteId !== profileRouteId) return null;
    return o as CountryWizardDraft;
  } catch {
    return null;
  }
}
