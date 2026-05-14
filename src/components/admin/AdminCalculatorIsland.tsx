import { useState, useCallback } from 'react';
import { buildRuleDisplayGroups, type CalcRuleRow } from '../../lib/calculator-rule-groups';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AdminPlan = {
  id: string;
  plan_name: string;
  included_pa_transactions: number;
  annual_fee: number;
  monthly_fee: number | null;
  extra_transaction_cost: number;
  confidence?: string;
  status: string;
};

type BreakdownRow = {
  input_key: string;
  label: string;
  volume: number;
  multiplier: number;
  pa_transactions: number;
  direction?: string;
  obligation?: string;
};

type PlanComparison = {
  plan_name: string;
  included: number;
  annual_fee: number;
  extra_cost: number;
  extra_transactions: number;
  total_annual_cost: number;
  recommended: boolean;
};

type CalcResult = {
  scenario_id?: string;
  total_pa_transactions: number;
  transaction_breakdown: BreakdownRow[];
  plan_comparison?: PlanComparison[];
  recommended_plan?: { plan_name: string } | null;
};

type SummaryState = 'idle' | 'loading' | 'done' | 'error';

type Props = {
  rules: CalcRuleRow[];
  plans: AdminPlan[];
  profileId: string;
  currency: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function computeTotal(rules: CalcRuleRow[], volumes: Record<string, number>) {
  return rules.reduce((sum, r) => sum + (volumes[r.input_key] ?? 0) * r.pa_transactions_per_item, 0);
}

function recommendedPlan(plans: AdminPlan[], totalPa: number): AdminPlan | null {
  const sorted = [...plans]
    .filter((p) => p.status === 'approved' || p.status === 'proposed')
    .sort((a, b) => a.included_pa_transactions - b.included_pa_transactions);
  return sorted.find((p) => p.included_pa_transactions >= totalPa) ?? sorted[sorted.length - 1] ?? null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminCalculatorIsland({ rules, plans, profileId, currency }: Props) {
  const groups = buildRuleDisplayGroups(rules);
  const sym = currency === 'EUR' ? '€' : currency;

  const [volumes, setVolumes] = useState<Record<string, number>>(() =>
    Object.fromEntries(rules.map((r) => [r.input_key, r.placeholder ?? 0]))
  );
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [calcState, setCalcState] = useState<'idle' | 'loading'>('idle');

  const [summary, setSummary] = useState<string | null>(null);
  const [summaryState, setSummaryState] = useState<SummaryState>('idle');
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const setVol = useCallback((key: string, val: number) => {
    setVolumes((prev) => ({ ...prev, [key]: val }));
  }, []);

  const totalPa = computeTotal(rules, volumes);
  const liveRec = recommendedPlan(plans, totalPa);

  async function handleCalculate() {
    setCalcState('loading');
    setCalcError(null);
    setCalcResult(null);
    setSummary(null);
    setSummaryState('idle');
    setSummaryError(null);

    // Build inputs and groups payload.
    const inputs: Record<string, number> = {};
    const calculator_form_groups: Array<{ display_label: string; input_keys: string[] }> = [];

    for (const g of groups) {
      const vol = volumes[g.input_keys[0]] ?? 0;
      for (const k of g.input_keys) {
        inputs[k] = vol;
      }
      calculator_form_groups.push({ display_label: g.displayLabel, input_keys: g.input_keys });
    }

    try {
      const res = await fetch('/api/pa/calculate', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profileId,
          client_name: 'Admin calculation',
          inputs,
          calculator_form: { groups: calculator_form_groups },
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCalcError(
          (data as { error?: string; message?: string }).error ||
          (data as { message?: string }).message ||
          `HTTP ${res.status}`
        );
        setCalcState('idle');
        return;
      }

      setCalcResult(data as CalcResult);
      setCalcState('idle');

      // Auto-fetch AI summary if we have a scenario_id.
      const scenarioId = (data as { scenario_id?: string }).scenario_id;
      if (scenarioId) {
        await fetchSummary(scenarioId);
      }
    } catch (err) {
      setCalcError(err instanceof Error ? err.message : 'Network error');
      setCalcState('idle');
    }
  }

  async function fetchSummary(scenarioId: string) {
    setSummaryState('loading');
    setSummaryError(null);
    try {
      const res = await fetch(`/api/pa/scenarios/${encodeURIComponent(scenarioId)}/generate-summary`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSummaryError(
          (data as { error?: string }).error || `Summary failed (HTTP ${res.status})`
        );
        setSummaryState('error');
        return;
      }
      const text =
        (data as { ai_summary?: string }).ai_summary ||
        (data as { summary?: string }).summary ||
        '';
      setSummary(text || null);
      setSummaryState('done');
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : 'Network error');
      setSummaryState('error');
    }
  }

  async function handleGenerateSummary() {
    if (!calcResult?.scenario_id) return;
    await fetchSummary(calcResult.scenario_id);
  }

  const breakdown = calcResult?.transaction_breakdown ?? [];
  const planComp = calcResult?.plan_comparison ?? [];
  const totalCalcPa = calcResult?.total_pa_transactions ?? 0;
  const recPlanName = calcResult?.recommended_plan?.plan_name ?? null;
  const loading = calcState === 'loading';

  return (
    <div className="admin-calc-layout">
      {/* ── Left: Rule inputs ── */}
      <section className="admin-calc-form-panel">
        <div className="admin-calc-section-head">
          <h2>Transaction Volumes</h2>
          <p>Enter annual transaction volumes. Multipliers are applied automatically.</p>
        </div>

        <div className="admin-rules-grid">
          {groups.map((g) => (
            <div key={g.input_keys[0]} className="admin-rule-card">
              <label className="admin-rule-label" htmlFor={`vol-${g.input_keys[0]}`}>
                {g.displayLabel}
              </label>
              <span className="admin-rule-hint">{g.multiplierHint}</span>
              <div className="admin-number-wrap">
                <input
                  id={`vol-${g.input_keys[0]}`}
                  type="number"
                  min="0"
                  step="1"
                  className="admin-number-input"
                  value={volumes[g.input_keys[0]] ?? 0}
                  onChange={(e) => setVol(g.input_keys[0], Math.max(0, parseInt(e.target.value, 10) || 0))}
                />
                <span className="admin-unit">/ yr</span>
              </div>
              <div className="admin-rule-pa-preview">
                <span>{fmt((volumes[g.input_keys[0]] ?? 0) * g.rules[0].pa_transactions_per_item)} PA</span>
              </div>
            </div>
          ))}
        </div>

        {/* Running total */}
        <div className="admin-calc-total-bar">
          <span className="admin-calc-total-label">Estimated PA transactions</span>
          <span className="admin-calc-total-val">{fmt(totalPa)}</span>
        </div>

        {/* Live plan hint */}
        {liveRec && (
          <div className="admin-calc-live-hint">
            → fits <strong>{liveRec.plan_name}</strong> ({fmt(liveRec.included_pa_transactions)} PA incl.)
          </div>
        )}

        <button
          type="button"
          className="admin-btn-calculate"
          disabled={loading}
          onClick={handleCalculate}
        >
          {loading ? (
            <>
              <span className="animate-pulse">Calculating</span>
              <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="2"/>
                <line x1="8" y1="10" x2="12" y2="10"/><line x1="12" y1="6" x2="12" y2="14"/>
                <line x1="8" y1="18" x2="16" y2="18"/><line x1="8" y1="14" x2="10" y2="14"/>
              </svg>
              Calculate & Summarize
            </>
          )}
        </button>

        {calcError && <p className="admin-calc-error">{calcError}</p>}

        {/* ── AI Summary ── */}
        <div className={`admin-summary-panel${summaryState !== 'idle' ? ' admin-summary-visible' : ''}`}>
          <div className="admin-summary-head">
            <h3>AI Summary</h3>
            {calcResult?.scenario_id && summaryState === 'done' && (
              <button
                type="button"
                className="admin-summary-refresh"
                onClick={handleGenerateSummary}
                title="Regenerate summary"
              >
                ↻
              </button>
            )}
          </div>
          {summaryState === 'loading' && (
            <p className="admin-summary-loading">Generating summary…</p>
          )}
          {summaryState === 'error' && (
            <p className="admin-summary-error">{summaryError}</p>
          )}
          {summaryState === 'done' && summary && (
            <p className="admin-summary-text">{summary}</p>
          )}
          {summaryState === 'done' && !summary && (
            <p className="admin-summary-empty">No summary returned by the agent.</p>
          )}
        </div>
      </section>

      {/* ── Right: Results ── */}
      <section className="admin-calc-results-panel">
        {!calcResult ? (
          <div className="admin-results-placeholder">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2"/>
              <line x1="8" y1="10" x2="12" y2="10"/><line x1="12" y1="6" x2="12" y2="14"/>
              <line x1="8" y1="18" x2="16" y2="18"/><line x1="8" y1="14" x2="10" y2="14"/>
            </svg>
            <p>Enter volumes and click <strong>Calculate &amp; Summarize</strong> to see results.</p>
          </div>
        ) : (
          <>
            {/* Transaction breakdown */}
            <div className="admin-result-block">
              <h3>Transaction Breakdown</h3>
              <table className="admin-result-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th className="num">Volume</th>
                    <th className="num">× Mult.</th>
                    <th className="num">PA tx</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map((row) => (
                    <tr key={row.input_key}>
                      <td>
                        <span className="breakdown-text">{row.label || row.input_key}</span>
                        {row.direction && (
                          <span className={`dir-mini ${row.direction === 'Issued' ? 'dir-issued' : 'dir-received'}`}>
                            {row.direction}
                          </span>
                        )}
                      </td>
                      <td className="num muted">{fmt(row.volume)}</td>
                      <td className="num">×{row.multiplier}</td>
                      <td className="num strong">{fmt(row.pa_transactions)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="total-row">
                    <td colSpan={3} className="total-label">Total PA / year</td>
                    <td className="num total-val">{fmt(totalCalcPa)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Plan comparison */}
            {planComp.length > 0 && (
              <div className="admin-result-block">
                <h3>Plan Comparison</h3>
                <table className="admin-result-table">
                  <thead>
                    <tr>
                      <th>Plan</th>
                      <th className="num">Annual fee</th>
                      <th className="num">Included PA</th>
                      <th className="num">Extra / PA</th>
                      <th className="num">Total / yr</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planComp.map((p) => (
                      <tr key={p.plan_name} className={p.recommended ? 'plan-row plan-recommended' : 'plan-row'}>
                        <td>
                          <div className="plan-name-cell">
                            {p.recommended && <span className="rec-badge">★ Best</span>}
                            <span className={p.recommended ? 'plan-name rec' : 'plan-name'}>{p.plan_name}</span>
                          </div>
                        </td>
                        <td className="num">{sym}{fmt(p.annual_fee)}</td>
                        <td className="num muted">{fmt(p.included)}</td>
                        <td className="num muted">{sym}{p.extra_cost.toFixed(3)}</td>
                        <td className="num">
                          <strong className={p.recommended ? 'rec-cost' : ''}>{sym}{fmt(p.total_annual_cost)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Plans list ── */}
      <section className="admin-plans-section">
        <h2 className="admin-plans-title">
          Pricing Plans
          <span className="admin-plans-count">{plans.length} plan{plans.length !== 1 ? 's' : ''}</span>
        </h2>
        {plans.length === 0 ? (
          <p className="admin-plans-empty">No plans configured for this profile yet.</p>
        ) : (
          <div className="admin-plans-grid">
            {plans
              .slice()
              .sort((a, b) => a.included_pa_transactions - b.included_pa_transactions)
              .map((plan) => {
                const isRec =
                  (recPlanName && plan.plan_name === recPlanName) ||
                  (!recPlanName && liveRec && plan.id === liveRec.id);
                const extra = Math.max(0, totalPa - plan.included_pa_transactions);
                const totalCost = plan.annual_fee + extra * plan.extra_transaction_cost;
                return (
                  <div
                    key={plan.id}
                    className={`admin-plan-card${isRec ? ' admin-plan-recommended' : ''}`}
                  >
                    {isRec && <span className="admin-plan-rec-badge">★ Recommended</span>}
                    <div className="admin-plan-name">{plan.plan_name}</div>
                    <div className="admin-plan-included">
                      {fmt(plan.included_pa_transactions)} PA included
                    </div>
                    <div className="admin-plan-fees">
                      <span className="admin-plan-fee-line">
                        <span>Annual fee</span>
                        <strong>{sym}{fmt(plan.annual_fee)}</strong>
                      </span>
                      {plan.monthly_fee != null && (
                        <span className="admin-plan-fee-line">
                          <span>Activation</span>
                          <span>{sym}{fmt(plan.monthly_fee)}</span>
                        </span>
                      )}
                      <span className="admin-plan-fee-line">
                        <span>Extra / PA</span>
                        <span>{sym}{plan.extra_transaction_cost.toFixed(3)}</span>
                      </span>
                    </div>
                    {totalPa > 0 && (
                      <div className="admin-plan-estimate">
                        Est. {sym}{fmt(totalCost)} / yr
                        {extra > 0 && (
                          <span className="admin-plan-extra-note"> (+{fmt(extra)} extra PA)</span>
                        )}
                      </div>
                    )}
                    <div className="admin-plan-confidence">
                      {plan.confidence && <span className="conf-dot">{plan.confidence}</span>}
                      <span className={`plan-status-badge status-${plan.status}`}>{plan.status}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </section>
    </div>
  );
}
