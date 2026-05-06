/**
 * Server-safe, XSS-aware HTML for PlanAdvisor “AI summary” copy from Agente Resumen.
 * Handles the common shape: ### headings, **bold**, and * … lists where list items
 * start with * **Plan….
 *
 * Escapes all user/agent text; only emits a fixed set of tags (h3, p, ul, li, strong).
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Turn **segments** into <strong>; every other segment is escaped plain text. */
export function summaryMarkdownInlineToHtml(text: string): string {
  const parts = text.split(/\*\*/);
  return parts
    .map((chunk, i) =>
      i % 2 === 0 ? escapeHtml(chunk) : `<strong>${escapeHtml(chunk)}</strong>`,
    )
    .join("");
}

/** Heading line: first word Title-case, optional following words all lowercase (e.g. Top three options). */
const HEADING_BODY = /^([A-Z][a-z]+(?:\s+[a-z]+)*)\s+([\s\S]+)$/;

const LIST_MARK_BEFORE_BOLD = /\s\*\s+\*\*/;

/**
 * Convert AI summary markdown to a safe HTML fragment (no outer wrapper).
 */
export function summaryMarkdownToHtml(markdown: string): string {
  const raw = markdown.trim();
  if (!raw) return "";

  const chunks = raw.split(/\s(?=###\s)/).map((c) => c.trim());
  const out: string[] = [];

  for (const chunk of chunks) {
    if (!chunk) continue;

    if (!chunk.startsWith("###")) {
      out.push(`<p class="summary-md-p">${summaryMarkdownInlineToHtml(chunk)}</p>`);
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
            `<li class="summary-md-li">${summaryMarkdownInlineToHtml(item)}</li>`,
        )
        .join("");
      out.push(`<ul class="summary-md-ul">${lis}</ul>`);
    } else {
      out.push(
        `<p class="summary-md-p">${summaryMarkdownInlineToHtml(bodyTrim)}</p>`,
      );
    }
  }

  return out.join("\n");
}
