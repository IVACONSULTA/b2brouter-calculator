/** Rows from Plan Advisor `/calculator/profile/:id` (or local dummy rules). */
export type CalcRuleRow = {
  input_key: string;
  label: string;
  direction: string;
  obligation: string;
  operation_group: string;
  pa_transactions_per_item: number;
  placeholder: number;
};

export type RuleDisplayGroup = {
  /** Shown in the form — `operation_group` when set, otherwise the row `label`. */
  displayLabel: string;
  input_keys: string[];
  rules: CalcRuleRow[];
  multiplierHint: string;
  placeholder: number;
};

function multiplierHintFromMults(mults: number[]): string {
  const u = [...new Set(mults.map((m) => Math.round(m * 1000) / 1000))].sort((a, b) => a - b);
  if (u.length === 1) return `×${u[0]} PA`;
  return `×${u[0]}–×${u[u.length - 1]} PA`;
}

/** Same merge key as Plan Advisor `POST /calculator/calculate` (must stay in sync). */
export function transactionRuleMergeBucketKey(r: CalcRuleRow): string {
  const og = (r.operation_group ?? '').trim();
  const dir = String(r.direction ?? '').trim();
  const obl = String(r.obligation ?? '').trim();
  let mult = Number(r.pa_transactions_per_item);
  if (!Number.isFinite(mult)) mult = 0;
  const multKey = Math.round(mult * 1e9) / 1e9;
  return JSON.stringify([og, dir, obl, multKey]);
}

/**
 * One form field per group of rules that share
 * `operation_group`, `direction`, `obligation`, and `pa_transactions_per_item`.
 */
export function buildRuleDisplayGroups(rows: CalcRuleRow[]): RuleDisplayGroup[] {
  const bucket = new Map<string, CalcRuleRow[]>();
  const order: string[] = [];

  for (const r of rows) {
    const k = transactionRuleMergeBucketKey(r);
    if (!bucket.has(k)) {
      bucket.set(k, []);
      order.push(k);
    }
    bucket.get(k)!.push(r);
  }

  return order.map((k) => {
    const list = bucket.get(k)!;
    const og = list[0].operation_group?.trim();
    const labels = [...new Set(list.map((x) => x.label))];
    const displayLabel =
      og && og.length > 0 ? og : labels.length === 1 ? (labels[0] as string) : list[0].label;
    const mults = list.map((x) => x.pa_transactions_per_item);
    const placeholder = Math.max(...list.map((x) => x.placeholder));

    return {
      displayLabel,
      input_keys: list.map((x) => x.input_key),
      rules: list,
      multiplierHint: multiplierHintFromMults(mults),
      placeholder,
    };
  });
}
