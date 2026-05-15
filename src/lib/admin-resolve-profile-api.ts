import { paFetchJson } from './pa-api';
import { paUploadLog } from './pa-upload-debug';

type ProfileListRow = {
  id: string;
  version: string;
  country_code?: string;
  provider_name?: string;
  created_at?: string;
};

type ProfileDetail = {
  id: string;
  country_id: string;
  provider_id: string;
  version: string;
};

function normalizeProviderName(s: string): string {
  return String(s ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

async function fetchProfileDetail(token: string, profileId: string): Promise<ProfileDetail | null> {
  const detail = await paFetchJson<ProfileDetail & Record<string, unknown>>(
    `/admin/profiles/${encodeURIComponent(profileId)}`,
    token,
  );
  if (!detail.ok) {
    paUploadLog('resolvePlanAdvisorProfileIds: GET profile detail failed', {
      profileListId: profileId,
      httpStatus: detail.status,
      error: detail.error,
    });
    return null;
  }
  if (!detail.data?.country_id || !detail.data?.provider_id) {
    paUploadLog('resolvePlanAdvisorProfileIds: profile detail missing country_id/provider_id', {
      profileListId: profileId,
      keys: detail.data ? Object.keys(detail.data) : [],
    });
    return null;
  }

  return {
    id: String(detail.data.id),
    country_id: String(detail.data.country_id),
    provider_id: String(detail.data.provider_id),
    version: String(detail.data.version ?? ''),
  };
}

export type ResolvePlanAdvisorProfileOptions = {
  /** Prefer GET /admin/profiles/:id (from PUBLIC_PA_UI_PROFILE_UUID_MAP). */
  uuidOverride?: string | null;
};

/**
 * Match a UI profile (country + provider + version) to Plan Advisor UUIDs via list + detail.
 */
export async function resolvePlanAdvisorProfileIds(
  token: string,
  match: { countryCode: string; providerName: string; version: string },
  options?: ResolvePlanAdvisorProfileOptions,
): Promise<ProfileDetail | null> {
  const override = options?.uuidOverride?.trim();
  if (override) {
    const resolved = await fetchProfileDetail(token, override);
    if (resolved) {
      paUploadLog('resolvePlanAdvisorProfileIds: resolved via PUBLIC_PA_UI_PROFILE_UUID_MAP', resolved);
    }
    return resolved;
  }

  const list = await paFetchJson<ProfileListRow[]>('/admin/profiles', token);
  if (!list.ok) {
    paUploadLog('resolvePlanAdvisorProfileIds: GET /admin/profiles failed', {
      httpStatus: list.status,
      error: list.error,
    });
    return null;
  }
  if (!Array.isArray(list.data)) {
    paUploadLog('resolvePlanAdvisorProfileIds: GET /admin/profiles: unexpected shape', {
      httpStatus: list.status,
    });
    return null;
  }

  paUploadLog('resolvePlanAdvisorProfileIds: profile list ok', {
    rowCount: list.data.length,
    wanted: match,
  });

  const sameCountry = (r: ProfileListRow) =>
    String(r.country_code ?? '').toUpperCase() === match.countryCode.toUpperCase();

  let row = list.data.find(
    (r) =>
      sameCountry(r) &&
      normalizeProviderName(String(r.provider_name ?? '')) === normalizeProviderName(match.providerName) &&
      String(r.version ?? '') === match.version,
  );

  if (!row?.id) {
    const byCp = list.data.filter(
      (r) =>
        sameCountry(r) &&
        normalizeProviderName(String(r.provider_name ?? '')) === normalizeProviderName(match.providerName),
    );
    if (byCp.length === 1) {
      row = byCp[0];
      paUploadLog('resolvePlanAdvisorProfileIds: matched by country+provider (single API row)', {
        wantedVersion: match.version,
        matchedVersion: row.version,
      });
    } else if (byCp.length > 1) {
      const sorted = [...byCp].sort((a, b) =>
        String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')),
      );
      row = sorted[0];
      paUploadLog('resolvePlanAdvisorProfileIds: matched by country+provider (latest created_at)', {
        wantedVersion: match.version,
        matchedVersion: row.version,
        candidates: byCp.length,
      });
    }
  }

  if (!row?.id) {
    const sample = list.data.slice(0, 12).map((r) => ({
      country_code: r.country_code,
      provider_name: r.provider_name,
      version: r.version,
    }));
    paUploadLog('resolvePlanAdvisorProfileIds: no row matches country/provider/version', {
      wanted: match,
      sampleRows: sample,
    });
    return null;
  }

  const resolved = await fetchProfileDetail(token, row.id);
  if (!resolved) return null;

  paUploadLog('resolvePlanAdvisorProfileIds: resolved UUIDs', resolved);
  return resolved;
}
