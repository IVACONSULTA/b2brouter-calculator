import { useState, useCallback, useRef, useEffect } from 'react';

export type TransactionRule = {
  id: string;
  input_key: string;
  label: string;
  direction: string;
  obligation: string;
  operation_group: string;
  pa_transactions_per_item: number;
  reason?: string;
  source_excerpt?: string;
  confidence?: string;
  status: string;
};

type EditableFields = {
  label: string;
  input_key: string;
  direction: string;
  obligation: string;
  operation_group: string;
  pa_transactions_per_item: string;
  source_excerpt: string;
};

type RuleState = {
  original: TransactionRule;
  edits: EditableFields;
  dirty: boolean;
  saving: 'idle' | 'saving' | 'saved' | 'error';
  errorMsg: string | null;
};

type SaveState = 'idle' | 'saving' | 'done' | 'error';

type DeleteConfirm = {
  ruleIdx: number;
  ruleId: string;
  label: string;
  deleting: boolean;
  error: string | null;
};

const DIRECTION_OPTIONS = ['Issued', 'Received', ''];
const OBLIGATION_OPTIONS = ['E-invoicing', 'E-reporting', 'Payment e-reporting', ''];

function toEditable(r: TransactionRule): EditableFields {
  return {
    label: r.label ?? '',
    input_key: r.input_key ?? '',
    direction: r.direction ?? '',
    obligation: r.obligation ?? '',
    operation_group: r.operation_group ?? '',
    pa_transactions_per_item: String(r.pa_transactions_per_item ?? 0),
    source_excerpt: r.source_excerpt ?? '',
  };
}

/** `domestic_issued` → `Domestic issued` */
function formatInputKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/^(.)/, (ch) => ch.toUpperCase());
}

function statusBadgeClass(s: string) {
  if (s === 'approved') return 'rule-status-badge approved';
  if (s === 'rejected') return 'rule-status-badge rejected';
  if (s === 'pending_confirmation') return 'rule-status-badge pending';
  return 'rule-status-badge proposed';
}

type Props = {
  initialRules: TransactionRule[];
  profileId: string;
};

export default function ExtractedRulesPanel({ initialRules, profileId }: Props) {
  const [rules, setRules] = useState<RuleState[]>(() =>
    initialRules.map((r) => ({
      original: r,
      edits: toEditable(r),
      dirty: false,
      saving: 'idle',
      errorMsg: null,
    }))
  );
  const [saveAll, setSaveAll] = useState<SaveState>('idle');
  const [saveAllError, setSaveAllError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  // Focus the cancel button whenever the modal opens.
  useEffect(() => {
    if (deleteConfirm) cancelBtnRef.current?.focus();
  }, [deleteConfirm?.ruleIdx]);

  // Close modal on Escape key.
  useEffect(() => {
    if (!deleteConfirm) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleteConfirm.deleting) setDeleteConfirm(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [deleteConfirm]);

  const update = useCallback((idx: number, field: keyof EditableFields, value: string) => {
    setRules((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        const edits = { ...r.edits, [field]: value };
        const dirty =
          edits.label !== r.original.label ||
          edits.input_key !== r.original.input_key ||
          edits.direction !== (r.original.direction ?? '') ||
          edits.obligation !== (r.original.obligation ?? '') ||
          edits.operation_group !== (r.original.operation_group ?? '') ||
          edits.pa_transactions_per_item !== String(r.original.pa_transactions_per_item ?? 0) ||
          edits.source_excerpt !== (r.original.source_excerpt ?? '');
        return { ...r, edits, dirty };
      })
    );
  }, []);

  async function patchRule(ruleState: RuleState): Promise<TransactionRule | null> {
    const { id } = ruleState.original;
    const body = {
      label: ruleState.edits.label,
      input_key: ruleState.edits.input_key,
      direction: ruleState.edits.direction || null,
      obligation: ruleState.edits.obligation || null,
      operation_group: ruleState.edits.operation_group || null,
      pa_transactions_per_item: parseFloat(ruleState.edits.pa_transactions_per_item) || 0,
      source_excerpt: ruleState.edits.source_excerpt || null,
    };
    const res = await fetch(`/api/pa/admin/rules/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(
        (err as { error?: string; message?: string }).error ||
          (err as { message?: string }).message ||
          `HTTP ${res.status}`
      );
    }
    return res.json() as Promise<TransactionRule>;
  }

  function confirmDelete(idx: number) {
    const rule = rules[idx];
    setDeleteConfirm({
      ruleIdx: idx,
      ruleId: rule.original.id,
      label: formatInputKey(rule.edits.input_key || rule.original.input_key),
      deleting: false,
      error: null,
    });
  }

  async function handleDeleteConfirmed() {
    if (!deleteConfirm) return;
    setDeleteConfirm((d) => d && { ...d, deleting: true, error: null });

    try {
      const res = await fetch(
        `/api/pa/admin/rules/${encodeURIComponent(deleteConfirm.ruleId)}`,
        { method: 'DELETE', credentials: 'same-origin' },
      );
      if (!res.ok && res.status !== 204) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(
          (err as { error?: string }).error || `HTTP ${res.status}`,
        );
      }
      // Remove from local list.
      setRules((prev) => prev.filter((_, i) => i !== deleteConfirm.ruleIdx));
      setDeleteConfirm(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not delete rule.';
      setDeleteConfirm((d) => d && { ...d, deleting: false, error: msg });
    }
  }

  async function handleUpdateAll() {
    const dirtyIndices = rules.map((r, i) => (r.dirty ? i : -1)).filter((i) => i >= 0);
    if (!dirtyIndices.length) return;

    setSaveAll('saving');
    setSaveAllError(null);

    // Mark all dirty rules as saving.
    setRules((prev) =>
      prev.map((r, i) =>
        dirtyIndices.includes(i) ? { ...r, saving: 'saving', errorMsg: null } : r
      )
    );

    const results = await Promise.allSettled(dirtyIndices.map((i) => patchRule(rules[i])));

    let anyError = false;
    setRules((prev) => {
      const next = [...prev];
      dirtyIndices.forEach((ruleIdx, resultIdx) => {
        const result = results[resultIdx];
        if (result.status === 'fulfilled' && result.value) {
          const updated = result.value;
          next[ruleIdx] = {
            original: updated,
            edits: toEditable(updated),
            dirty: false,
            saving: 'saved',
            errorMsg: null,
          };
        } else {
          anyError = true;
          const msg =
            result.status === 'rejected'
              ? result.reason instanceof Error
                ? result.reason.message
                : String(result.reason)
              : 'Unknown error';
          next[ruleIdx] = { ...next[ruleIdx], saving: 'error', errorMsg: msg };
        }
      });
      return next;
    });

    setSaveAll(anyError ? 'error' : 'done');
    if (anyError) {
      setSaveAllError('Some rules could not be saved. See individual errors above.');
    }

    // Reset "saved" indicators after 2 s.
    setTimeout(() => {
      setRules((prev) =>
        prev.map((r) => (r.saving === 'saved' ? { ...r, saving: 'idle' } : r))
      );
      setSaveAll((s) => (s === 'done' ? 'idle' : s));
    }, 2000);
  }

  const dirtyCount = rules.filter((r) => r.dirty).length;

  if (rules.length === 0) {
    return (
      <div className="rules-empty">
        No rules extracted yet. Go back to Documents and click &ldquo;Go to Analysis&rdquo; to run
        document analysis.
      </div>
    );
  }

  return (
    <>
      <div className="rules-list">
        {rules.map((ruleState, idx) => {
          const { edits, original, dirty, saving, errorMsg } = ruleState;
          return (
            <div
              key={original.id}
              className={`rule-form-card status-${original.status}${dirty ? ' rule-dirty' : ''}${saving === 'saved' ? ' rule-saved' : ''}`}
              data-rule-id={original.id}
            >
              {/* Header row */}
              <div className="rule-card-header">
                <span className={statusBadgeClass(original.status)}>{original.status}</span>
                <span className="rule-input-key-display" title={original.input_key}>
                  {formatInputKey(edits.input_key || original.input_key)}
                </span>
                <span className="rule-label-display" title={edits.label || original.label}>
                  {edits.label || original.label}
                </span>
                <span
                  className="rule-direction-badge"
                  title={`Direction: ${edits.direction || 'none'}`}
                >
                  {edits.direction || '—'}
                </span>
                {dirty && <span className="rule-dirty-badge">unsaved</span>}
                {saving === 'saved' && <span className="rule-saved-badge">✓ saved</span>}
                {saving === 'saving' && <span className="rule-saving-badge">saving…</span>}
                <button
                  type="button"
                  className="rule-delete-btn"
                  aria-label={`Delete rule ${formatInputKey(edits.input_key || original.input_key)}`}
                  title="Delete rule"
                  onClick={() => confirmDelete(idx)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              </div>

              {saving === 'error' && errorMsg && (
                <div className="rule-save-error">{errorMsg}</div>
              )}

              <div className="rule-fields">
                {/* input_key — editable slug */}
                <div className="rule-field">
                  <label htmlFor={`ik-${original.id}`}>Input key</label>
                  <input
                    id={`ik-${original.id}`}
                    type="text"
                    value={edits.input_key}
                    onChange={(e) => update(idx, 'input_key', e.target.value)}
                  />
                </div>

                {/* operation_group — replaces label in the top-right slot */}
                <div className="rule-field">
                  <label htmlFor={`og-${original.id}`}>Operation group</label>
                  <input
                    id={`og-${original.id}`}
                    type="text"
                    value={edits.operation_group}
                    onChange={(e) => update(idx, 'operation_group', e.target.value)}
                  />
                </div>

                {/* direction */}
                <div className="rule-field">
                  <label htmlFor={`dir-${original.id}`}>Direction</label>
                  <select
                    id={`dir-${original.id}`}
                    value={edits.direction}
                    onChange={(e) => update(idx, 'direction', e.target.value)}
                  >
                    {DIRECTION_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o || '— none —'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* obligation */}
                <div className="rule-field">
                  <label htmlFor={`obl-${original.id}`}>Obligation</label>
                  <select
                    id={`obl-${original.id}`}
                    value={edits.obligation}
                    onChange={(e) => update(idx, 'obligation', e.target.value)}
                  >
                    {OBLIGATION_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o || '— none —'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* pa_transactions_per_item */}
                <div className="rule-field">
                  <label htmlFor={`pa-${original.id}`}>PA transactions / item</label>
                  <input
                    id={`pa-${original.id}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={edits.pa_transactions_per_item}
                    onChange={(e) => update(idx, 'pa_transactions_per_item', e.target.value)}
                  />
                </div>

                {/* label */}
                <div className="rule-field">
                  <label htmlFor={`lbl-${original.id}`}>Label</label>
                  <input
                    id={`lbl-${original.id}`}
                    type="text"
                    value={edits.label}
                    onChange={(e) => update(idx, 'label', e.target.value)}
                  />
                </div>

                {/* source_excerpt — full width */}
                <div className="rule-field full">
                  <label htmlFor={`src-${original.id}`}>Source excerpt</label>
                  <textarea
                    id={`src-${original.id}`}
                    rows={2}
                    value={edits.source_excerpt}
                    onChange={(e) => update(idx, 'source_excerpt', e.target.value)}
                  />
                </div>

                {/* reason — read-only */}
                {original.reason && (
                  <div className="rule-field full rule-field-readonly">
                    <label>Reason (read-only)</label>
                    <p className="rule-reason-text">{original.reason}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div
          className="rule-delete-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleteConfirm.deleting) setDeleteConfirm(null);
          }}
        >
          <div className="rule-delete-dialog">
            <div className="rule-delete-dialog-icon" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </div>
            <h3 id="delete-dialog-title" className="rule-delete-dialog-title">
              Delete rule?
            </h3>
            <p className="rule-delete-dialog-body">
              <strong>{deleteConfirm.label}</strong> will be permanently removed. This cannot be
              undone.
            </p>
            {deleteConfirm.error && (
              <p className="rule-delete-dialog-error">{deleteConfirm.error}</p>
            )}
            <div className="rule-delete-dialog-actions">
              <button
                ref={cancelBtnRef}
                type="button"
                className="btn-dialog-cancel"
                disabled={deleteConfirm.deleting}
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-dialog-confirm"
                disabled={deleteConfirm.deleting}
                onClick={handleDeleteConfirmed}
              >
                {deleteConfirm.deleting ? 'Deleting…' : 'Delete rule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update button */}
      <div className="rules-update-bar">
        {saveAllError && <span className="rules-update-error">{saveAllError}</span>}
        <button
          type="button"
          className="btn-update-rules"
          disabled={dirtyCount === 0 || saveAll === 'saving'}
          onClick={handleUpdateAll}
        >
          {saveAll === 'saving' ? (
            <>
              <span className="animate-pulse">Saving</span>
              <svg
                className="animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </>
          ) : (
            `Update rules${dirtyCount > 0 ? ` (${dirtyCount})` : ''}`
          )}
        </button>
      </div>
    </>
  );
}
