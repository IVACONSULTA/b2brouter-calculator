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
  /** Shown in the form — formatted from `input_key` (snake_case → Title Case). */
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

/** Words that should always be rendered in full uppercase. */
const UPPERCASE_WORDS = new Set(['b2b', 'b2c', 'vat', 'tva', 'id', 'edi', 'api', 'ui']);

function formatWord(word: string): string {
  const lower = word.toLowerCase();
  if (UPPERCASE_WORDS.has(lower)) return word.toUpperCase();
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Formats a snake_case input_key into a human-readable label.
 * Known acronyms (B2B, B2C, VAT, TVA, …) are fully uppercased.
 * Segments that contain "/" are split, each part formatted, then rejoined with " / ".
 * e.g. "issued_b2b_domestic"  → "Issued B2B Domestic"
 *      "issued_b2b/b2c"       → "Issued B2B / B2C"
 *      "received_b2c/tva"     → "Received B2C / TVA"
 */
export function formatInputKey(key: string): string {
  return key
    .split('_')
    .map((segment) =>
      segment.includes('/')
        ? segment.split('/').map(formatWord).join(' / ')
        : formatWord(segment),
    )
    .join(' ');
}

/**
 * One form field per unique `input_key`.
 * Duplicate input_keys are silently skipped (keeps the first occurrence).
 * The display label is derived from the input_key via `formatInputKey`.
 */
export function buildRuleDisplayGroups(rows: CalcRuleRow[]): RuleDisplayGroup[] {
  const seen = new Set<string>();
  const groups: RuleDisplayGroup[] = [];

  for (const r of rows) {
    if (seen.has(r.input_key)) continue;
    seen.add(r.input_key);

    groups.push({
      displayLabel: formatInputKey(r.input_key),
      input_keys: [r.input_key],
      rules: [r],
      multiplierHint: multiplierHintFromMults([r.pa_transactions_per_item]),
      placeholder: r.placeholder,
    });
  }

  return groups;
}
