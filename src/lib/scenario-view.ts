/** View model for `/scenarios/[id].astro`, derived from backend `GET /api/scenarios/:id`. */

export interface CalculatorFormGroup {
  display_label: string;
  input_keys: string[];
}

/** Mirrors the calculator’s grouped fields; stored in `input_json.calculator_form`. */
export interface CalculatorForm {
  groups: CalculatorFormGroup[];
}

export interface ScenarioBreakdownRow {
  label: string;
  /** Granular rule label when it differs from the grouped Type label. */
  detail_label?: string;
  direction: string;
  obligation: string;
  volume: number;
  multiplier: number;
  pa_transactions: number;
}

export interface ScenarioPlanComparisonRow {
  plan_name: string;
  annual_fee: number;
  included: number;
  extra_cost: number;
  extra_transactions: number;
  total_annual_cost: number;
  recommended: boolean;
}

export interface ScenarioView {
  id: string;
  client_name: string;
  country: string;
  provider: string;
  profile_id: string;
  profile_version: string;
  currency: string;
  calculation_basis: string;
  created_at: string;
  created_by?: string;
  inputs: Record<string, number>;
  /** Present when the scenario was saved from the grouped calculator UI. */
  calculator_form: CalculatorForm | null;
  transaction_breakdown: ScenarioBreakdownRow[];
  total_pa_transactions: number;
  plan_comparison: ScenarioPlanComparisonRow[];
  recommended_plan: {
    plan_name: string;
    total_annual_cost: number;
    annual_fee: number;
    included_pa_transactions: number;
    extra_transaction_cost: number;
    extra_transactions: number;
  };
  assumptions: Array<{ key: string; value: string }>;
  ai_summary: string | null;
  has_summary: boolean;
}

interface ResultJsonLike {
  total_pa_transactions?: number;
  transaction_breakdown?: Array<Record<string, unknown>>;
  plan_comparison?: Array<Record<string, unknown>>;
  recommended_plan?: Record<string, unknown>;
  assumptions?: Array<{ key?: string; value?: string }>;
  calculation_basis?: string;
}

function num(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseScenarioInputJson(inputJson: Record<string, unknown>): {
  inputs: Record<string, number>;
  calculator_form: CalculatorForm | null;
} {
  if (!inputJson || typeof inputJson !== 'object') {
    return { inputs: {}, calculator_form: null };
  }

  const maybeInputs = inputJson.inputs;
  if (maybeInputs && typeof maybeInputs === 'object' && !Array.isArray(maybeInputs)) {
    const inputs: Record<string, number> = {};
    for (const [k, v] of Object.entries(maybeInputs as Record<string, unknown>)) {
      inputs[k] = num(v);
    }

    let calculator_form: CalculatorForm | null = null;
    const cfRaw = inputJson.calculator_form;
    if (cfRaw && typeof cfRaw === 'object' && cfRaw !== null && 'groups' in cfRaw) {
      const rawGroups = (cfRaw as { groups?: unknown }).groups;
      if (Array.isArray(rawGroups)) {
        const groups: CalculatorFormGroup[] = [];
        for (const g of rawGroups) {
          if (!g || typeof g !== 'object') continue;
          const go = g as Record<string, unknown>;
          const display_label = String(go.display_label ?? '').trim();
          const input_keys = Array.isArray(go.input_keys)
            ? go.input_keys.map((k) => String(k).trim()).filter(Boolean)
            : [];
          if (!display_label || !input_keys.length) continue;
          groups.push({ display_label, input_keys });
        }
        if (groups.length) calculator_form = { groups };
      }
    }
    return { inputs, calculator_form };
  }

  const inputs: Record<string, number> = {};
  for (const [k, v] of Object.entries(inputJson)) {
    if (k === 'calculator_form' || k === 'inputs') continue;
    inputs[k] = num(v);
  }
  return { inputs, calculator_form: null };
}

export function normalizeScenarioDetail(raw: Record<string, unknown>): ScenarioView {
  const profileId =
    typeof raw.profile_id === 'string' ? raw.profile_id : String(raw.profile_id ?? '');
  const inputJson =
    typeof raw.input_json === 'object' && raw.input_json !== null ? raw.input_json : {};
  let result: ResultJsonLike =
    typeof raw.result_json === 'object' && raw.result_json !== null
      ? (raw.result_json as ResultJsonLike)
      : {};

  if (typeof result === 'string') {
    try {
      result = JSON.parse(result) as ResultJsonLike;
    } catch {
      result = {};
    }
  }

  const rec = result.recommended_plan ?? {};
  const recPlanId =
    typeof rec.plan_id === 'string' ? rec.plan_id : (rec.plan_id as string | undefined);

  const breakdown: ScenarioBreakdownRow[] = Array.isArray(result.transaction_breakdown)
    ? result.transaction_breakdown.map((row) => {
        const multiplier = num(
          row.pa_transactions_per_item ?? row.multiplier,
          (row.multiplier as number | undefined) ?? 1,
        );
        const detailRaw = row.detail_label;
        const detail_label =
          typeof detailRaw === 'string' && detailRaw.trim() ? String(detailRaw).trim() : undefined;
        return {
          label: String(row.label ?? ''),
          ...(detail_label ? { detail_label } : {}),
          direction: String(row.direction ?? ''),
          obligation: String(row.obligation ?? ''),
          volume: num(row.volume),
          multiplier,
          pa_transactions: num(row.pa_transactions),
        };
      })
    : [];

  const comparison: ScenarioPlanComparisonRow[] = Array.isArray(result.plan_comparison)
    ? result.plan_comparison.map((p) => {
        const planId =
          typeof p.plan_id === 'string' ? p.plan_id : (p.plan_id as string | undefined);
        return {
          plan_name: String(p.plan_name ?? ''),
          annual_fee: num(p.annual_fee),
          included: num(p.included_pa_transactions ?? p.included),
          extra_cost: num(p.extra_transaction_cost ?? p.extra_cost),
          extra_transactions: num(p.excess_pa_transactions ?? p.extra_transactions),
          total_annual_cost: num(p.total_annual_cost),
          recommended:
            !!(recPlanId && planId && recPlanId === planId) || Boolean(p.recommended),
        };
      })
    : [];

  const rp = result.recommended_plan ?? {};
  const assumptions = Array.isArray(result.assumptions)
    ? result.assumptions.map((a) => ({
        key: String(a?.key ?? ''),
        value: String(a?.value ?? ''),
      }))
    : [];

  const recommendedPlan = {
    plan_name: String(rp.plan_name ?? ''),
    total_annual_cost: num(rp.total_annual_cost),
    annual_fee: num(rp.annual_fee),
    included_pa_transactions: num(rp.included_pa_transactions ?? rp.included),
    extra_transaction_cost: num(rp.extra_transaction_cost ?? rp.extra_cost),
    extra_transactions: num(rp.excess_pa_transactions ?? rp.extra_transactions),
  };

  const { inputs, calculator_form } = parseScenarioInputJson(inputJson as Record<string, unknown>);

  const aiSummary = typeof raw.ai_summary === 'string' ? raw.ai_summary : null;

  return {
    id: String(raw.id ?? ''),
    client_name:
      typeof raw.client_name === 'string' && raw.client_name.trim()
        ? raw.client_name
        : '(unnamed client)',
    country: String(raw.country_name ?? ''),
    provider: String(raw.provider_name ?? ''),
    profile_id: profileId,
    profile_version: String(raw.version ?? '—'),
    currency: String(raw.currency ?? ''),
    calculation_basis:
      String(raw.calculation_basis ?? result.calculation_basis ?? 'PA transactions'),
    created_at:
      typeof raw.created_at === 'string'
        ? raw.created_at
        : new Date(String(raw.created_at)).toISOString(),
    created_by:
      typeof raw.created_by_email === 'string' ? raw.created_by_email : undefined,
    inputs,
    calculator_form,
    transaction_breakdown: breakdown,
    total_pa_transactions: num(result.total_pa_transactions),
    plan_comparison: comparison,
    recommended_plan: recommendedPlan,
    assumptions,
    ai_summary: aiSummary,
    has_summary: Boolean(aiSummary && aiSummary.length > 0),
  };
}

/** Static demo payloads from `dummy-data.ts` (flat shape → ScenarioView). */
export function scenarioFromLegacyDummy(d: {
  id: string;
  client_name: string;
  country: string;
  provider: string;
  profile_id: string;
  profile_version: string;
  currency: string;
  calculation_basis: string;
  created_at: string;
  created_by?: string;
  inputs: Record<string, number>;
  transaction_breakdown: Array<{
    label: string;
    detail_label?: string;
    direction: string;
    obligation: string;
    volume: number;
    multiplier: number;
    pa_transactions: number;
  }>;
  total_pa_transactions: number;
  plan_comparison: Array<{
    plan_name: string;
    annual_fee: number;
    included: number;
    extra_cost: number;
    extra_transactions: number;
    total_annual_cost: number;
    recommended: boolean;
  }>;
  recommended_plan: {
    plan_name: string;
    total_annual_cost: number;
    annual_fee: number;
    included_pa_transactions: number;
    extra_transaction_cost: number;
    extra_transactions: number;
  };
  assumptions?: Array<{ key: string; value: string }>;
  ai_summary: string | null;
  has_summary: boolean;
}): ScenarioView {
  return {
    id: d.id,
    client_name: d.client_name,
    country: d.country,
    provider: d.provider,
    profile_id: d.profile_id,
    profile_version: d.profile_version,
    currency: d.currency,
    calculation_basis: d.calculation_basis,
    created_at: d.created_at,
    created_by: d.created_by,
    inputs: { ...d.inputs },
    calculator_form: null,
    transaction_breakdown: d.transaction_breakdown.map((row) => ({
      label: row.label,
      ...(row.detail_label ? { detail_label: row.detail_label } : {}),
      direction: row.direction,
      obligation: row.obligation,
      volume: row.volume,
      multiplier: row.multiplier,
      pa_transactions: row.pa_transactions,
    })),
    total_pa_transactions: d.total_pa_transactions,
    plan_comparison: d.plan_comparison.map((p) => ({
      plan_name: p.plan_name,
      annual_fee: p.annual_fee,
      included: p.included,
      extra_cost: p.extra_cost,
      extra_transactions: p.extra_transactions,
      total_annual_cost: p.total_annual_cost,
      recommended: p.recommended,
    })),
    recommended_plan: {
      plan_name: d.recommended_plan.plan_name,
      total_annual_cost: d.recommended_plan.total_annual_cost,
      annual_fee: d.recommended_plan.annual_fee,
      included_pa_transactions: d.recommended_plan.included_pa_transactions,
      extra_transaction_cost: d.recommended_plan.extra_transaction_cost,
      extra_transactions: d.recommended_plan.extra_transactions,
    },
    assumptions: d.assumptions ?? [],
    ai_summary: d.ai_summary,
    has_summary: d.has_summary,
  };
}
