/**
 * Parse Crew final output: narrative + EXTRACTED_RULES_JSON array for the admin UI.
 */

export type ParsedExtractedRule = {
  id: string;
  label: string;
  inputKey: string;
  direction: string;
  obligation: string;
  operationGroup: string;
  paPerItem: string;
  status: string;
  reason: string;
  sourceExcerpt: string;
};

function normalizeRule(raw: Record<string, unknown>, index: number): ParsedExtractedRule {
  const id = String(raw.id ?? `ext-${index}`);
  return {
    id,
    label: String(raw.label ?? ''),
    inputKey: String(raw.inputKey ?? ''),
    direction: String(raw.direction ?? ''),
    obligation: String(raw.obligation ?? ''),
    operationGroup: String(raw.operationGroup ?? ''),
    paPerItem: String(raw.paPerItem ?? ''),
    status: String(raw.status ?? 'proposed'),
    reason: String(raw.reason ?? ''),
    sourceExcerpt: String(raw.sourceExcerpt ?? ''),
  };
}

function tryParseJsonArray(fragment: string): ParsedExtractedRule[] {
  const trimmed = fragment.trim();
  if (!trimmed) return [];
  const data = JSON.parse(trimmed) as unknown;
  if (!Array.isArray(data)) return [];
  return data.map((item, i) =>
    normalizeRule(item && typeof item === 'object' ? (item as Record<string, unknown>) : {}, i),
  );
}

/**
 * Split crew markdown narrative from the rules JSON block.
 */
export function parseCrewAnalysisOutput(raw: string): { assistant: string; rules: ParsedExtractedRule[] } {
  const text = String(raw ?? '');
  const marker = 'EXTRACTED_RULES_JSON';
  const idx = text.indexOf(marker);

  if (idx !== -1) {
    const assistant = text.slice(0, idx).trim();
    const rest = text.slice(idx + marker.length).trim();
    try {
      return { assistant, rules: tryParseJsonArray(rest) };
    } catch {
      return { assistant, rules: [] };
    }
  }

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    try {
      const rules = tryParseJsonArray(fence[1] ?? '[]');
      const assistant = text.slice(0, text.indexOf(fence[0])).trim();
      return { assistant: assistant || text.trim(), rules };
    } catch {
      /* fall through */
    }
  }

  return { assistant: text.trim(), rules: [] };
}
