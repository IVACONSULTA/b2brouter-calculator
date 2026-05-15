/**
 * Maps admin UI profile slugs (e.g. profile-it-pdp-1) to Plan Advisor `calculation_profiles.id`
 * UUIDs when dummy-data country/provider/version strings do not match Railway rows.
 *
 * Netlify / env:
 * `PUBLIC_PA_UI_PROFILE_UUID_MAP={"profile-it-pdp-1":"<uuid-from-railway>"}`
 */
export function parsePaUiProfileUuidMap(): Record<string, string> {
  const raw = (import.meta.env.PUBLIC_PA_UI_PROFILE_UUID_MAP ?? '').trim();
  if (!raw) return {};
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(o)) {
      if (typeof k === 'string' && typeof v === 'string') {
        const id = v.trim();
        if (id) out[k] = id;
      }
    }
    return out;
  } catch {
    return {};
  }
}
