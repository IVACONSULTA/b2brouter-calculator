/**
 * Server-safe, XSS-aware HTML for PlanAdvisor “AI summary” copy from Agente Resumen.
 *
 * Supported shapes:
 * - ### headings + **bold** + lists starting with `* **Plan…` or numbered `1. …`
 * - Plain agent text with sections: Context / Top three options / Recommendation
 *   and bullets like `* Plan 1 (498 EUR): …` or numbered `1. Plan 1: … 2. Plan 2: …`
 *
 * Escapes all user/agent text; only emits a fixed set of tags (h3, p, ul, ol, li, strong, br).
 */

export type SummaryInlineOptions = {
  /** Insert `<br />` before each `**bold**` segment when there is preceding text on the line. */
  breakBeforeBold?: boolean;
  /** Turn newline characters in plain (non-bold) segments into `<br />`. */
  newlineToBr?: boolean;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Turn **segments** into <strong>; every other segment is escaped plain text. */
export function summaryMarkdownInlineToHtml(
  text: string,
  opts?: SummaryInlineOptions,
): string {
  const breakBeforeBold = opts?.breakBeforeBold ?? false;
  const newlineToBr = opts?.newlineToBr ?? false;
  const parts = text.split(/\*\*/);
  return parts
    .map((chunk, i) => {
      if (i % 2 === 0) {
        let plain = escapeHtml(chunk);
        if (newlineToBr) plain = plain.replace(/\n/g, "<br />");
        return plain;
      }
      const strong = `<strong>${escapeHtml(chunk)}</strong>`;
      if (!breakBeforeBold) return strong;
      const prev = parts[i - 1] ?? "";
      if (prev.trim().length > 0) return `<br />${strong}`;
      return strong;
    })
    .join("");
}

function summaryBodyInline(text: string): string {
  return summaryMarkdownInlineToHtml(text, {
    breakBeforeBold: true,
    newlineToBr: true,
  });
}

function summaryListItemInline(text: string): string {
  return summaryMarkdownInlineToHtml(text, {
    breakBeforeBold: true,
    newlineToBr: true,
  });
}

/** Heading line: first word Title-case, optional following words all lowercase (e.g. Top three options). */
const HEADING_BODY = /^([A-Z][a-z]+(?:\s+[a-z]+)*)\s+([\s\S]+)$/;

const LIST_MARK_BEFORE_BOLD = /\s\*\s+\*\*/;

/** Body starting with "1. …" with further "2. " / "3. " items → ordered list segments. */
function trySplitNumberedListItems(body: string): string[] | null {
  const t = body.trim();
  if (!/^\d+\.\s/.test(t)) return null;
  const items = t
    .split(/\s+(?=\d+\.\s)/)
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length > 0 ? items : null;
}

/** Remove "1. " / "2. " prefix — `<ol>` supplies markers. */
function stripLeadingNumberMarker(item: string): string {
  return item.replace(/^\d+\.\s*/, "").trim();
}

/** Display title for known section labels (regex match may be any case). */
function formatAgentSectionTitle(captured: string): string {
  const key = captured.toLowerCase();
  if (key === "top three options") return "Top three options";
  if (key === "recommendation") return "Recommendation";
  if (key === "context") return "Context";
  return captured.charAt(0).toUpperCase() + captured.slice(1).toLowerCase();
}

/**
 * Agente Resumen sometimes returns a single block:
 * "Context … Top three options * Plan 1 … * Plan 2 … Recommendation …"
 */
function summaryLabeledSectionsToHtml(raw: string): string {
  const re = /\b(Context|Top three options|Recommendation)\s+/gi;
  const hits = [...raw.matchAll(re)];
  if (hits.length === 0) {
    return `<p class="summary-md-p">${summaryBodyInline(raw)}</p>`;
  }

  const out: string[] = [];

  for (let i = 0; i < hits.length; i++) {
    const titleRaw = hits[i]![1]!;
    const startBody = hits[i]!.index! + hits[i]![0].length;
    const endBody =
      i + 1 < hits.length ? hits[i + 1]!.index! : raw.length;
    const body = raw.slice(startBody, endBody).trim();
    const title = formatAgentSectionTitle(titleRaw);
    const lowerTitle = titleRaw.toLowerCase();
    const isTopThreeSection = lowerTitle === "top three options";

    out.push(
      `<h3 class="summary-md-h3${isTopThreeSection ? " summary-md-h3-top-options" : ""}">${escapeHtml(title)}</h3>`,
    );

    if (!body) continue;

    const hasAsteriskItems =
      body.includes("*") && /\*\s+\S/.test(body);

    if (lowerTitle === "top three options") {
      const numberedItems = trySplitNumberedListItems(body);
      if (numberedItems && numberedItems.length >= 1) {
        const lis = numberedItems
          .map((item) => stripLeadingNumberMarker(item))
          .filter(Boolean)
          .map(
            (item) =>
              `<li class="summary-md-li">${summaryListItemInline(item)}</li>`,
          )
          .join("");
        out.push(
          `<ol class="summary-md-ol summary-md-plan-options">${lis}</ol>`,
        );
        continue;
      }
      if (hasAsteriskItems) {
        const items = body
          .split(/^\s*\*\s*/m)
          .map((s) => s.trim())
          .filter(Boolean);
        if (items.length > 0) {
          const lis = items
            .map(
              (item) =>
                `<li class="summary-md-li">${summaryListItemInline(item)}</li>`,
            )
            .join("");
          out.push(
            `<ul class="summary-md-ul summary-md-plan-options">${lis}</ul>`,
          );
          continue;
        }
      }
    }

    const numberedItems = trySplitNumberedListItems(body);
    if (numberedItems && numberedItems.length > 1) {
      const lis = numberedItems
        .map((item) => stripLeadingNumberMarker(item))
        .filter(Boolean)
        .map(
          (item) =>
            `<li class="summary-md-li">${summaryListItemInline(item)}</li>`,
        )
        .join("");
      out.push(`<ol class="summary-md-ol">${lis}</ol>`);
      continue;
    }

    out.push(`<p class="summary-md-p">${summaryBodyInline(body)}</p>`);
  }

  return out.join("\n");
}

function summaryHashHeadingsToHtml(raw: string): string {
  const chunks = raw.split(/\s(?=###\s)/).map((c) => c.trim());
  const out: string[] = [];

  for (const chunk of chunks) {
    if (!chunk) continue;

    if (!chunk.startsWith("###")) {
      out.push(`<p class="summary-md-p">${summaryBodyInline(chunk)}</p>`);
      continue;
    }

    const inner = chunk.replace(/^###\s+/, "").trim();
    if (!inner) continue;

    let heading = "";
    let body: string;

    const listStart = inner.search(LIST_MARK_BEFORE_BOLD);
    if (listStart >= 0) {
      heading = inner.slice(0, listStart).trim();
      body = inner.slice(listStart + 1).trim();
    } else {
      const m = inner.match(HEADING_BODY);
      if (m) {
        heading = m[1]!.trim();
        body = m[2]!.trim();
      } else {
        body = inner;
      }
    }

    if (heading) {
      out.push(
        `<h3 class="summary-md-h3">${summaryMarkdownInlineToHtml(heading)}</h3>`,
      );
    }

    if (!body) continue;

    const bodyTrim = body.trim();
    if (/^\*/.test(bodyTrim)) {
      const rawItems = bodyTrim.split(/(?<=\S)\s+(?=\*\s+\*\*)/);
      const lis = rawItems
        .map((item) => item.replace(/^\*\s+/, "").trim())
        .filter(Boolean)
        .map(
          (item) =>
            `<li class="summary-md-li">${summaryListItemInline(item)}</li>`,
        )
        .join("");
      out.push(`<ul class="summary-md-ul">${lis}</ul>`);
    } else {
      const numberedItems = trySplitNumberedListItems(bodyTrim);
      if (numberedItems) {
        const lis = numberedItems
          .map((item) => stripLeadingNumberMarker(item))
          .filter(Boolean)
          .map(
            (item) =>
              `<li class="summary-md-li">${summaryListItemInline(item)}</li>`,
          )
          .join("");
        out.push(`<ol class="summary-md-ol">${lis}</ol>`);
      } else {
        out.push(`<p class="summary-md-p">${summaryBodyInline(bodyTrim)}</p>`);
      }
    }
  }

  return out.join("\n");
}

export function summaryMarkdownToHtml(markdown: string): string {
  const raw = markdown.trim();
  if (!raw) return "";

  if (/###\s/.test(raw)) {
    return summaryHashHeadingsToHtml(raw);
  }

  if (/\b(?:Context|Top three options|Recommendation)\b/i.test(raw)) {
    return summaryLabeledSectionsToHtml(raw);
  }

  return `<p class="summary-md-p">${summaryBodyInline(raw)}</p>`;
}
