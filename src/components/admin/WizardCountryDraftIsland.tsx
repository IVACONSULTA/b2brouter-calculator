import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AdminWizardProfile } from '../../lib/admin-wizard-profile-fallback';
import {
  loadCountryWizardDraft,
  type CountryWizardDraft,
} from '../../lib/country-wizard-draft';
import '../../styles/wizard-draft-ribbon.css';

type WizardCountryDraftContextValue = {
  draft: CountryWizardDraft | null;
  /** Merged dummy/profile placeholder + session draft (for display & downstream fields). */
  profile: AdminWizardProfile;
  refresh: () => void;
};

const WizardCountryDraftContext = createContext<WizardCountryDraftContextValue | null>(null);

export function useWizardCountryDraft(): WizardCountryDraftContextValue {
  const v = useContext(WizardCountryDraftContext);
  if (!v) {
    throw new Error('useWizardCountryDraft must be used within WizardCountryDraftProvider');
  }
  return v;
}

function mergeDraftWithFallback(
  fallback: AdminWizardProfile,
  draft: CountryWizardDraft | null,
): AdminWizardProfile {
  if (!draft) return fallback;
  const providerType = draft.providerType === 'other' ? 'PA' : draft.providerType;
  return {
    ...fallback,
    id: draft.profileRouteId,
    country: { code: draft.countryCode, name: draft.countryName },
    provider: { name: draft.providerName, type: providerType },
    currency: draft.currency,
    version: draft.version,
    status: 'draft',
    analysis_id: null,
    active_from: null,
  };
}

function WizardCountryDraftProvider({
  routeProfileId,
  fallbackProfile,
  children,
}: {
  routeProfileId: string;
  fallbackProfile: AdminWizardProfile;
  children: ReactNode;
}) {
  const [draft, setDraft] = useState<CountryWizardDraft | null>(() =>
    loadCountryWizardDraft(routeProfileId),
  );

  const refresh = useCallback(() => {
    setDraft(loadCountryWizardDraft(routeProfileId));
  }, [routeProfileId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const profile = useMemo(
    () => mergeDraftWithFallback(fallbackProfile, draft),
    [fallbackProfile, draft],
  );

  const value = useMemo(
    () => ({ draft, profile, refresh }),
    [draft, profile, refresh],
  );

  return (
    <WizardCountryDraftContext.Provider value={value}>{children}</WizardCountryDraftContext.Provider>
  );
}

function WizardCountryTitleSync({ prefix }: { prefix: string }) {
  const { profile } = useWizardCountryDraft();
  useEffect(() => {
    document.title = `${prefix} — ${profile.country.name} / ${profile.provider.name}`;
  }, [prefix, profile.country.name, profile.provider.name]);
  return null;
}

function WizardCountryRibbon() {
  const { draft, profile } = useWizardCountryDraft();
  if (!draft && !profile.id.startsWith('profile-draft-')) return null;

  const hasApiUUIDs = draft?.apiProfileId && draft?.apiCountryId && draft?.apiProviderId;

  return (
    <div className="wizard-draft-ribbon" role="status">
      <span>
        Profile: <strong>{profile.country.name}</strong> ({profile.country.code}) ·{' '}
        <strong>{profile.provider.name}</strong> — {profile.provider.type}
        {hasApiUUIDs ? (
          <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', opacity: 0.7 }}>
            ✓ Railway profile
          </span>
        ) : (
          <span
            style={{
              marginLeft: '0.5rem',
              fontSize: '0.7rem',
              opacity: 0.7,
              color: 'var(--color-warning, #f59e0b)',
            }}
          >
            ⚠ Local draft only
          </span>
        )}
      </span>
    </div>
  );
}

function WizardSetupCardHeader() {
  const { profile } = useWizardCountryDraft();

  return (
    <div className="card-header">
      <div className="header-left">
        <div className="country-badge">
          <span className="code">{profile.country.code}</span>
          <span className="cname">{profile.country.name}</span>
        </div>
        <span className="provider-tag">
          {profile.provider.name} · {profile.provider.type}
        </span>
      </div>
      <span className={`status-badge status-${profile.status}`}>
        {profile.status.replace('_', ' ')}
      </span>
    </div>
  );
}

function WizardSetupFormSync() {
  const { profile, draft } = useWizardCountryDraft();

  useEffect(() => {
    const setVal = (id: string, val: string) => {
      const el = document.getElementById(id);
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement
      ) {
        el.value = val;
      }
    };

    setVal('country', profile.country.name);
    setVal('provider_name', profile.provider.name);
    setVal('provider_type', profile.provider.type);
    setVal('currency', profile.currency);
    setVal('version', profile.version);
    setVal('calculation_basis', draft?.calculationBasis ?? 'PA transactions');
    setVal('notes', draft?.notes ?? '');
  }, [profile, draft]);

  return null;
}

function WizardDocumentsButtonSync({
  ssrApiTarget,
}: {
  ssrApiTarget: {
    profile_id: string;
    country_id: string;
    provider_id: string;
  } | null;
}) {
  const { draft } = useWizardCountryDraft();

  useEffect(() => {
    const btn = document.getElementById('btn-go-analysis');
    if (!(btn instanceof HTMLButtonElement)) return;

    // Prefer draft UUIDs (from step 1 profile creation), fallback to SSR resolution
    const profileId = draft?.apiProfileId || ssrApiTarget?.profile_id || '';
    const countryId = draft?.apiCountryId || ssrApiTarget?.country_id || '';
    const providerId = draft?.apiProviderId || ssrApiTarget?.provider_id || '';

    btn.dataset.profileId = profileId;
    btn.dataset.countryId = countryId;
    btn.dataset.providerId = providerId;
  }, [draft, ssrApiTarget]);

  return null;
}

function WizardAiAnalysisDatasetSync({
  ssrApiTarget,
}: {
  ssrApiTarget: {
    profile_id: string;
    country_id: string;
    provider_id: string;
  } | null;
}) {
  const { draft, profile } = useWizardCountryDraft();
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.page-admin-country-ai-analysis');
    if (!root) return;
    // Priority: UUID created at step 1 (sessionStorage) → SSR-resolved UUID → route slug fallback.
    // Using the real DB UUID ensures the chat API can find the correct documents.
    root.dataset.profileId = draft?.apiProfileId || ssrApiTarget?.profile_id || profile.id;
    root.dataset.country = profile.country.name;
    root.dataset.provider = profile.provider.name;
  }, [profile, draft, ssrApiTarget]);
  return null;
}

export type WizardCountryDraftIslandProps = {
  routeProfileId: string;
  /** JSON-serialized AdminWizardProfile from Astro SSR */
  fallbackProfileJson: string;
  /** JSON-serialized apiTarget from SSR (may be null if no resolution) */
  fallbackApiTarget?: string | null;
  mode: 'setup' | 'documents' | 'ai-analysis';
};

function parseFallback(json: string): AdminWizardProfile | null {
  try {
    return JSON.parse(json) as AdminWizardProfile;
  } catch {
    return null;
  }
}

function parseApiTarget(json: string | null | undefined): {
  profile_id: string;
  country_id: string;
  provider_id: string;
} | null {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default function WizardCountryDraftIsland({
  routeProfileId,
  fallbackProfileJson,
  fallbackApiTarget,
  mode,
}: WizardCountryDraftIslandProps) {
  const fallbackProfile = parseFallback(fallbackProfileJson);
  const ssrApiTarget = parseApiTarget(fallbackApiTarget);
  if (!fallbackProfile) return null;

  const titlePrefix =
    mode === 'setup' ? 'Setup' : mode === 'documents' ? 'Documents' : 'AI analysis';

  return (
    <WizardCountryDraftProvider routeProfileId={routeProfileId} fallbackProfile={fallbackProfile}>
      <WizardCountryTitleSync prefix={titlePrefix} />
      {mode === 'setup' ? (
        <>
          <WizardSetupCardHeader />
          <WizardSetupFormSync />
        </>
      ) : mode === 'documents' ? (
        <>
          <WizardCountryRibbon />
          <WizardDocumentsButtonSync ssrApiTarget={ssrApiTarget} />
        </>
      ) : (
        <>
          <WizardCountryRibbon />
          <WizardAiAnalysisDatasetSync ssrApiTarget={ssrApiTarget} />
        </>
      )}
    </WizardCountryDraftProvider>
  );
}
