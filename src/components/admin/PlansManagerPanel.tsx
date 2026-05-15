import { useState, useCallback } from 'react';

export type Plan = {
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
  initialPlans: Plan[];
  profileId: string;
  currency?: string;
};

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default function PlansManagerPanel({ initialPlans, profileId, currency = 'EUR' }: Props) {
  const sym = currency === 'EUR' ? '€' : currency;
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [edits, setEdits] = useState<Record<string, Partial<Plan>>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const updateField = useCallback((id: string, field: keyof Plan, value: unknown) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
    setDirty((prev) => new Set(prev).add(id));
    setSaved((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
  }, []);

  async function savePlan(id: string) {
    const patch = edits[id];
    if (!patch || Object.keys(patch).length === 0) return;

    setSaving((prev) => new Set(prev).add(id));
    setErrors((prev) => ({ ...prev, [id]: '' }));

    try {
      const res = await fetch(`/api/pa/admin/plans/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors((prev) => ({
          ...prev,
          [id]: (data as { error?: string; message?: string }).error || (data as { message?: string }).message || `HTTP ${res.status}`,
        }));
        setSaving((prev) => {
          const n = new Set(prev);
          n.delete(id);
          return n;
        });
        return;
      }

      // Update local state with returned data
      setPlans((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                plan_name: (data as { plan_name?: string }).plan_name ?? p.plan_name,
                included_pa_transactions: Number((data as { included_pa_transactions?: number }).included_pa_transactions ?? p.included_pa_transactions),
                annual_fee: Number((data as { annual_fee?: number }).annual_fee ?? p.annual_fee),
                monthly_fee: (data as { monthly_fee?: number | null }).monthly_fee ?? p.monthly_fee,
                extra_transaction_cost: Number((data as { extra_transaction_cost?: number }).extra_transaction_cost ?? p.extra_transaction_cost),
                confidence: (data as { confidence?: string }).confidence ?? p.confidence,
                status: (data as { status?: string }).status ?? p.status,
              }
            : p
        )
      );

      setDirty((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
      setEdits((prev) => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
      setSaved((prev) => new Set(prev).add(id));
      setTimeout(() => {
        setSaved((prev) => {
          const n = new Set(prev);
          n.delete(id);
          return n;
        });
      }, 2000);
    } catch (err) {
      setErrors((prev) => ({ ...prev, [id]: err instanceof Error ? err.message : 'Network error' }));
    } finally {
      setSaving((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    }
  }

  async function saveAll() {
    const ids = Array.from(dirty);
    if (ids.length === 0) return;
    await Promise.all(ids.map((id) => savePlan(id)));
  }

  async function deletePlan(id: string) {
    setDeleting(id);
    setErrors((prev) => ({ ...prev, [id]: '' }));

    try {
      const res = await fetch(`/api/pa/admin/plans/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors((prev) => ({
          ...prev,
          [id]: (data as { error?: string; message?: string }).error || (data as { message?: string }).message || `HTTP ${res.status}`,
        }));
        return;
      }

      setPlans((prev) => prev.filter((p) => p.id !== id));
      setDeleteConfirmId(null);
    } catch (err) {
      setErrors((prev) => ({ ...prev, [id]: err instanceof Error ? err.message : 'Network error' }));
    } finally {
      setDeleting(null);
    }
  }

  const hasDirty = dirty.size > 0;

  return (
    <div className="plans-manager">
      <div className="plans-list">
        {plans.length === 0 ? (
          <p className="plans-empty">No plans configured for this profile.</p>
        ) : (
          plans.map((plan) => {
            const isDirty = dirty.has(plan.id);
            const isSaving = saving.has(plan.id);
            const isSaved = saved.has(plan.id);
            const error = errors[plan.id];
            const isConfirmingDelete = deleteConfirmId === plan.id;

            const current: Plan = {
              ...plan,
              ...edits[plan.id],
            };

            return (
              <div
                key={plan.id}
                className={`plan-card${isDirty ? ' plan-dirty' : ''}${isSaved ? ' plan-saved' : ''}`}
              >
                <div className="plan-card-header">
                  <span className={`plan-status-badge status-${current.status}`}>{current.status}</span>
                  <div className="plan-card-actions">
                    {isDirty && !isSaving && (
                      <span className="plan-dirty-badge">Modified</span>
                    )}
                    {isSaved && <span className="plan-saved-badge">Saved ✓</span>}
                    {isSaving && <span className="plan-saving-badge">Saving…</span>}
                    <button
                      type="button"
                      className="plan-delete-btn"
                      onClick={() => setDeleteConfirmId(plan.id)}
                      title="Delete plan"
                      disabled={deleting === plan.id}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </div>
                </div>

                {isConfirmingDelete && (
                  <div className="plan-delete-overlay">
                    <div className="plan-delete-dialog">
                      <p>Delete <strong>{current.plan_name}</strong>?</p>
                      <div className="plan-delete-actions">
                        <button
                          type="button"
                          className="btn-cancel"
                          onClick={() => setDeleteConfirmId(null)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn-confirm-delete"
                          onClick={() => deletePlan(plan.id)}
                          disabled={deleting === plan.id}
                        >
                          {deleting === plan.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="plan-form-grid">
                  <div className="plan-field">
                    <label>Plan name</label>
                    <input
                      type="text"
                      value={current.plan_name}
                      onChange={(e) => updateField(plan.id, 'plan_name', e.target.value)}
                      className="plan-input"
                    />
                  </div>

                  <div className="plan-field">
                    <label>Included PA transactions</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={current.included_pa_transactions}
                      onChange={(e) => updateField(plan.id, 'included_pa_transactions', Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="plan-input"
                    />
                  </div>

                  <div className="plan-field">
                    <label>Annual fee ({sym})</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={current.annual_fee}
                      onChange={(e) => updateField(plan.id, 'annual_fee', Math.max(0, parseFloat(e.target.value) || 0))}
                      className="plan-input"
                    />
                  </div>

                  <div className="plan-field">
                    <label>Monthly fee ({sym})</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={current.monthly_fee ?? ''}
                      onChange={(e) =>
                        updateField(
                          plan.id,
                          'monthly_fee',
                          e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0)
                        )
                      }
                      className="plan-input"
                      placeholder="Optional"
                    />
                  </div>

                  <div className="plan-field">
                    <label>Extra / PA ({sym})</label>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={current.extra_transaction_cost}
                      onChange={(e) => updateField(plan.id, 'extra_transaction_cost', Math.max(0, parseFloat(e.target.value) || 0))}
                      className="plan-input"
                    />
                  </div>

                  <div className="plan-field">
                    <label>Confidence</label>
                    <select
                      value={current.confidence || 'medium'}
                      onChange={(e) => updateField(plan.id, 'confidence', e.target.value)}
                      className="plan-select"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>

                {error && <p className="plan-error">{error}</p>}

                {isDirty && (
                  <div className="plan-actions-row">
                    <button
                      type="button"
                      className="btn-save-plan"
                      onClick={() => savePlan(plan.id)}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving…' : 'Update plan'}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {plans.length > 0 && (
        <div className="plans-footer-bar">
          <button
            type="button"
            className="btn-update-all"
            onClick={saveAll}
            disabled={!hasDirty || saving.size > 0}
          >
            {saving.size > 0 ? 'Saving…' : hasDirty ? 'Update all modified plans' : 'No changes to save'}
          </button>
        </div>
      )}
    </div>
  );
}
