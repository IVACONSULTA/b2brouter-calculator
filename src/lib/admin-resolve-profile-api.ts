import { paFetchJson } from './pa-api';

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
  if (!list.ok || !Array.isArray(list.data)) return null;

  const row = list.data.find(
    (r) =>
      String(r.country_code ?? '').toUpperCase() === match.countryCode.toUpperCase() &&
      String(r.provider_name ?? '') === match.providerName &&
      String(r.version ?? '') === match.version,
  );
  if (!row?.id) return null;

  const detail = await paFetchJson<ProfileDetail & Record<string, unknown>>(
    `/admin/profiles/${encodeURIComponent(row.id)}`,
    token,
  );
  if (!detail.ok || !detail.data?.country_id || !detail.data?.provider_id) return null;

  return {
    id: String(detail.data.id),
    country_id: String(detail.data.country_id),
    provider_id: String(detail.data.provider_id),
    version: String(detail.data.version ?? match.version),
  };
}
