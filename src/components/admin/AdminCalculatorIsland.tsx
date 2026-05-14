import { useState, useCallback, useEffect } from 'react';
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

type Props = {
  profileId: string;
  currency?: string;
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

export default function AdminCalculatorIsland({ profileId, currency: currencyProp }: Props) {
  const [loadState, setLoadState] = useState<'loading' | 'done' | 'error'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rules, setRules] = useState<CalcRuleRow[]>([]);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [currency, setCurrency] = useState(currencyProp ?? 'EUR');

  // Fetch profile detail (rules + plans) via same-origin BFF on every mount/refresh.
  useEffect(() => {
    setLoadState('loading');
    setLoadError(null);

    fetch(`/api/pa/admin/profiles/${encodeURIComponent(profileId)}`, {
      credentials: 'same-origin',
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, status: r.status, data: d })))
      .then(({ ok, status, data }) => {
        if (!ok) {
          setLoadError(
            (data as { error?: string; message?: string }).error ||
            (data as { message?: string }).message ||
            `HTTP ${status}`
          );
          setLoadState('error');
          return;
        }

        const raw = data as {
          currency?: string;
          rules?: Array<{
            input_key: string;
            label: string;
            direction?: string;
            obligation?: string;
            operation_group?: string;
            pa_transactions_per_item: number | string;
            index_ui?: number | null;
          }>;
          plans?: Array<{
            id: string;
            plan_name: string;
            included_pa_transactions: number | string;
            annual_fee: number | string;
            monthly_fee?: number | string | null;
            extra_transaction_cost: number | string;
            confidence?: string;
            status: string;
          }>;
        };

        if (raw.currency) setCurrency(raw.currency);

        setRules(
          (raw.rules ?? []).map((r) => ({
            input_key: r.input_key,
            label: r.label,
            direction: r.direction ?? '',
            obligation: r.obligation ?? '',
            operation_group: r.operation_group ?? '',
            pa_transactions_per_item: Number(r.pa_transactions_per_item) || 0,
            placeholder: 0,
            index_ui: r.index_ui ?? null,
          }))
        );

        setPlans(
          (raw.plans ?? []).map((p) => ({
            id: p.id,
            plan_name: p.plan_name,
            included_pa_transactions: Number(p.included_pa_transactions) || 0,
            annual_fee: Number(p.annual_fee) || 0,
            monthly_fee: p.monthly_fee != null ? Number(p.monthly_fee) : null,
            extra_transaction_cost: Number(p.extra_transaction_cost) || 0,
            confidence: p.confidence,
            status: p.status,
          }))
        );

        setLoadState('done');

        // Let the static Astro header update itself with the fetched profile info.
        document.dispatchEvent(
          new CustomEvent('admin-calc-profile-loaded', { detail: data })
        );
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : 'Network error');
        setLoadState('error');
      });
  }, [profileId]);

  const groups = buildRuleDisplayGroups(rules);
  const sym = currency === 'EUR' ? '€' : currency;

  const [volumes, setVolumes] = useState<Record<string, number>>({});

  // Re-initialise volumes whenever rules change.
  useEffect(() => {
    setVolumes(Object.fromEntries(rules.map((r) => [r.input_key, 0])));
  }, [rules]);

  const setVol = useCallback((key: string, val: number) => {
    setVolumes((prev) => ({ ...prev, [key]: val }));
  }, []);

  const totalPa = computeTotal(rules, volumes);
  const liveRec = recommendedPlan(plans, totalPa);

  // Live breakdown — computed entirely client-side from multipliers.
  const breakdown = rules
    .map((r) => ({
      input_key: r.input_key,
      label: r.label,
      volume: volumes[r.input_key] ?? 0,
      multiplier: r.pa_transactions_per_item,
      pa_transactions: (volumes[r.input_key] ?? 0) * r.pa_transactions_per_item,
      direction: r.direction,
    }))
    .filter((r) => r.volume > 0);

  const hasVolumes = breakdown.length > 0;

  if (loadState === 'loading') {
    return (
      <div className="admin-calc-loading">
        <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        Loading profile data…
      </div>
    );
  }

  if (loadState === 'error') {
    return (
      <div className="admin-calc-load-error" role="alert">
        <strong>Could not load profile:</strong> {loadError}
      </div>
    );
  }

  return (
    <div className="admin-calc-layout">

      {/* ── Left col: Rule inputs ── */}
      <section className="admin-calc-form-panel">
        <div className="admin-calc-section-head">
          <h2>Transaction Volumes</h2>
          <p>Enter annual transaction volumes. Breakdown updates live.</p>
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

        <div className="admin-calc-total-bar">
          <span className="admin-calc-total-label">Estimated PA transactions</span>
          <span className="admin-calc-total-val">{fmt(totalPa)}</span>
        </div>

        {liveRec && (
          <div className="admin-calc-live-hint">
            → fits <strong>{liveRec.plan_name}</strong> ({fmt(liveRec.included_pa_transactions)} PA incl.)
          </div>
        )}
      </section>

      {/* ── Left col: Plans list (below form) ── */}
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

      {/* ── Right col: Live breakdown (spans both rows) ── */}
      <section className="admin-calc-results-panel">
        {!hasVolumes ? (
          <div className="admin-results-placeholder">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2"/>
              <line x1="8" y1="10" x2="12" y2="10"/><line x1="12" y1="6" x2="12" y2="14"/>
              <line x1="8" y1="18" x2="16" y2="18"/><line x1="8" y1="14" x2="10" y2="14"/>
            </svg>
            <p>Enter volumes on the left to see the live breakdown.</p>
          </div>
        ) : (
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
                  <td className="num total-val">{fmt(totalPa)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

    </div>
  );
}
