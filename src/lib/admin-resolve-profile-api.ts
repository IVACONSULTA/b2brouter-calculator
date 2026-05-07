import { paFetchJson } from './pa-api';
import { paUploadLog } from './pa-upload-debug';

type ProfileListRow = {
  id: string;
  version: string;
  country_code?: string;
  provider_name?: string;
};

type ProfileDetail = {
  id: string;
  country_id: string;
  provider_id: string;
  version: string;
};

/**
 * Match a UI profile (country + provider + version) to Plan Advisor UUIDs via list + detail.
 */
export async function resolvePlanAdvisorProfileIds(
  token: string,
  match: { countryCode: string; providerName: string; version: string },
): Promise<ProfileDetail | null> {
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

  const row = list.data.find(
    (r) =>
      String(r.country_code ?? '').toUpperCase() === match.countryCode.toUpperCase() &&
      String(r.provider_name ?? '') === match.providerName &&
      String(r.version ?? '') === match.version,
  );
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

  const detail = await paFetchJson<ProfileDetail & Record<string, unknown>>(
    `/admin/profiles/${encodeURIComponent(row.id)}`,
    token,
  );
  if (!detail.ok) {
    paUploadLog('resolvePlanAdvisorProfileIds: GET profile detail failed', {
      profileListId: row.id,
      httpStatus: detail.status,
      error: detail.error,
    });
    return null;
  }
  if (!detail.data?.country_id || !detail.data?.provider_id) {
    paUploadLog('resolvePlanAdvisorProfileIds: profile detail missing country_id/provider_id', {
      profileListId: row.id,
      keys: detail.data ? Object.keys(detail.data) : [],
    });
    return null;
  }

  const resolved = {
    id: String(detail.data.id),
    country_id: String(detail.data.country_id),
    provider_id: String(detail.data.provider_id),
    version: String(detail.data.version ?? match.version),
  };
  paUploadLog('resolvePlanAdvisorProfileIds: resolved UUIDs', resolved);
  return resolved;
}
