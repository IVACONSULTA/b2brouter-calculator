import type { APIRoute } from 'astro';
// pdfkit is a CJS module; default import works in Node ESM via interop
// eslint-disable-next-line @typescript-eslint/no-require-imports
import PDFDocument from 'pdfkit';
import { getFreshSupabaseAccessToken } from '../../../../../lib/supabase-session';
import { paFetchJson } from '../../../../../lib/pa-api';
import { normalizeScenarioDetail } from '../../../../../lib/scenario-view';
import { formatInputKey } from '../../../../../lib/calculator-rule-groups';

export const prerender = false;

// ─── Layout constants ────────────────────────────────────────────────────────

const MARGIN = 45;
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const CW = PAGE_W - MARGIN * 2; // 505.28

const C = {
  primary:   '#1e3a5f',
  muted:     '#6b7280',
  border:    '#d1d5db',
  rec:       '#166534',
  recBg:     '#f0fdf4',
  recBorder: '#86efac',
  headerBg:  '#f1f5f9',
  stripBg:   '#f9fafb',
  text:      '#111827',
  white:     '#ffffff',
  totalBg:   '#e8f0fe',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(v: number, decimals = 0): string {
  return v.toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

async function docToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

type Col = { label: string; w: number; align?: 'left' | 'right' | 'center' };

/** Draw a section heading bar. Returns the Y after the bar. */
function heading(doc: PDFKit.PDFDocument, title: string, y: number): number {
  const needed = 32;
  if (y + needed > PAGE_H - MARGIN - 30) {
    doc.addPage();
    y = MARGIN;
  }
  y += 10;
  doc.rect(MARGIN, y, CW, 20).fill(C.primary);
  doc.fillColor(C.white).fontSize(8.5).font('Helvetica-Bold')
    .text(title.toUpperCase(), MARGIN + 8, y + 6, { width: CW - 16, lineBreak: false });
  return y + 24;
}

/** Draw a table with header + rows. Returns the Y after the last row. */
function table(
  doc: PDFKit.PDFDocument,
  cols: Col[],
  rows: string[][],
  y: number,
  opts: { highlightRow?: number; rowH?: number } = {},
): number {
  const rowH = opts.rowH ?? 17;

  // Header
  doc.rect(MARGIN, y, CW, rowH).fill(C.headerBg);
  doc.rect(MARGIN, y, CW, rowH).lineWidth(0.5).stroke(C.border);
  let cx = MARGIN;
  doc.fillColor(C.muted).fontSize(7.5).font('Helvetica-Bold');
  for (const col of cols) {
    doc.text(col.label, cx + 4, y + 5, { width: col.w - 8, align: col.align ?? 'left', lineBreak: false });
    cx += col.w;
  }
  y += rowH;

  // Rows
  for (let ri = 0; ri < rows.length; ri++) {
    if (y + rowH > PAGE_H - MARGIN - 28) {
      doc.addPage();
      y = MARGIN;
    }
    const isRec = ri === opts.highlightRow;
    const bg = isRec ? C.recBg : ri % 2 === 1 ? C.stripBg : C.white;

    doc.rect(MARGIN, y, CW, rowH).fill(bg);
    doc.rect(MARGIN, y, CW, rowH).lineWidth(0.5).stroke(C.border);

    cx = MARGIN;
    doc.fillColor(isRec ? C.rec : C.text)
       .fontSize(8)
       .font(isRec ? 'Helvetica-Bold' : 'Helvetica');
    for (let ci = 0; ci < cols.length; ci++) {
      const col = cols[ci]!;
      doc.text(rows[ri]?.[ci] ?? '', cx + 4, y + 5, {
        width: col.w - 8,
        align: col.align ?? 'left',
        lineBreak: false,
      });
      cx += col.w;
    }
    y += rowH;
  }
  return y;
}

function footer(doc: PDFKit.PDFDocument, scenarioId: string): void {
  const fy = PAGE_H - 28;
  doc.rect(MARGIN, fy, CW, 0.5).fill(C.border);
  doc.fillColor(C.muted).fontSize(7).font('Helvetica')
    .text('Plan Advisor — Confidential', MARGIN, fy + 7, { width: CW / 2, lineBreak: false });
  doc.text(`Scenario ${scenarioId}`, MARGIN + CW / 2, fy + 7, {
    width: CW / 2,
    align: 'right',
    lineBreak: false,
  });
}

// ─── Route ───────────────────────────────────────────────────────────────────

export const GET: APIRoute = async ({ params, cookies }) => {
  const fresh = await getFreshSupabaseAccessToken(cookies);
  if (!fresh.ok) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const id = params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing scenario id.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const row = await paFetchJson<Record<string, unknown>>(
    `/scenarios/${encodeURIComponent(id)}`,
    fresh.accessToken,
  );
  if (!row.ok || !row.data) {
    return new Response(JSON.stringify({ error: 'Scenario not found.' }), {
      status: row.status || 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const s = normalizeScenarioDetail(row.data);

  // bufferPages: true lets us add a footer on all pages at the end
  const doc = new PDFDocument({ size: 'A4', margin: MARGIN, compress: true, bufferPages: true });

  // ── Cover header ────────────────────────────────────────────────────────────
  doc.rect(MARGIN, MARGIN, CW, 54).fill(C.primary);
  doc.fillColor(C.white).fontSize(14).font('Helvetica-Bold')
    .text('Plan Advisor · Scenario Report', MARGIN + 12, MARGIN + 10, { width: CW - 24, lineBreak: false });
  doc.fillColor('#93c5fd').fontSize(7.5).font('Helvetica')
    .text(
      `Generated ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`,
      MARGIN + 12,
      MARGIN + 28,
      { width: CW - 24, lineBreak: false },
    )
    .text(`Scenario ID: ${id}`, MARGIN + 12, MARGIN + 38, { width: CW - 24, lineBreak: false });

  // ── Client meta ─────────────────────────────────────────────────────────────
  let y = MARGIN + 54 + 14;
  doc.fillColor(C.text).fontSize(13).font('Helvetica-Bold').text(s.client_name, MARGIN, y);
  y = doc.y + 3;
  doc.fillColor(C.muted).fontSize(8.5).font('Helvetica')
    .text(
      `${s.country}  ·  ${s.provider}  ·  v${s.profile_version}  ·  ${s.currency}  ·  ${s.calculation_basis}`,
      MARGIN,
      y,
    );
  y = doc.y + 2;
  const created = new Date(s.created_at).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  doc.fillColor(C.muted).fontSize(8).text(`Created: ${created}`, MARGIN, y);
  y = doc.y + 10;

  // ── Recommended plan callout ─────────────────────────────────────────────────
  doc.rect(MARGIN, y, CW, 44).fillAndStroke(C.recBg, C.recBorder);
  doc.fillColor(C.rec).fontSize(7.5).font('Helvetica-Bold')
    .text('★  RECOMMENDED PLAN', MARGIN + 10, y + 8, { lineBreak: false });
  doc.fillColor(C.rec).fontSize(11).font('Helvetica-Bold')
    .text(s.recommended_plan.plan_name, MARGIN + 10, y + 20, { lineBreak: false, continued: true });
  doc.fillColor(C.text).fontSize(9).font('Helvetica')
    .text(`   ${s.currency} ${fmt(s.recommended_plan.total_annual_cost, 2)} / year`, { lineBreak: false });
  doc.fillColor(C.muted).fontSize(7.5).font('Helvetica')
    .text(
      `Base fee ${s.currency} ${fmt(s.recommended_plan.annual_fee, 2)}  ·  ` +
      `${fmt(s.recommended_plan.included_pa_transactions)} included PA  ·  ` +
      `${fmt(s.total_pa_transactions)} total PA`,
      MARGIN + 10,
      y + 34,
      { lineBreak: false },
    );
  y += 54;

  // ── Input Volumes ────────────────────────────────────────────────────────────
  y = heading(doc, 'Input Volumes', y);

  const inputEntries: Array<{ label: string; value: number }> = [];
  if (s.calculator_form?.groups?.length) {
    for (const g of s.calculator_form.groups) {
      const v = g.input_keys.length > 0 ? (s.inputs[g.input_keys[0]!] ?? 0) : 0;
      inputEntries.push({ label: g.display_label, value: v });
    }
  } else {
    for (const [k, v] of Object.entries(s.inputs)) {
      inputEntries.push({ label: formatInputKey(k), value: v });
    }
  }

  y = table(
    doc,
    [
      { label: 'Transaction Type', w: 360 },
      { label: 'Volume / Year', w: 145, align: 'right' },
    ],
    inputEntries.map((e) => [e.label, fmt(e.value)]),
    y,
  );
  y += 6;

  // ── Transaction Breakdown ─────────────────────────────────────────────────────
  y = heading(doc, 'Transaction Breakdown', y);
  y = table(
    doc,
    [
      { label: 'Type',            w: 153 },
      { label: 'Direction',       w: 64  },
      { label: 'Obligation',      w: 88  },
      { label: 'Volume',          w: 60, align: 'right' },
      { label: '× Mult.',         w: 50, align: 'right' },
      { label: 'PA Transactions', w: 90, align: 'right' },
    ],
    s.transaction_breakdown.map((r) => [
      r.label,
      r.direction,
      r.obligation,
      fmt(r.volume),
      `×${r.multiplier}`,
      fmt(r.pa_transactions),
    ]),
    y,
  );

  // Total row
  if (y + 22 > PAGE_H - MARGIN - 28) { doc.addPage(); y = MARGIN; }
  doc.rect(MARGIN, y, CW, 20).fill(C.totalBg);
  doc.rect(MARGIN, y, CW, 20).lineWidth(0.5).stroke(C.border);
  doc.fillColor(C.primary).fontSize(8.5).font('Helvetica-Bold')
    .text('Total PA Transactions / year', MARGIN + 4, y + 6, { width: CW - 98, lineBreak: false });
  doc.text(fmt(s.total_pa_transactions), MARGIN + CW - 94, y + 6, {
    width: 90,
    align: 'right',
    lineBreak: false,
  });
  y += 24;

  // ── Plan Comparison ──────────────────────────────────────────────────────────
  y = heading(doc, 'Plan Comparison', y);
  const recIndex = s.plan_comparison.findIndex((p) => p.recommended);
  y = table(
    doc,
    [
      { label: 'Plan',          w: 123 },
      { label: 'Annual Fee',    w: 75, align: 'right' },
      { label: 'Included PA',   w: 78, align: 'right' },
      { label: 'Extra / PA',    w: 65, align: 'right' },
      { label: 'Extra PA Used', w: 72, align: 'right' },
      { label: 'Total / Year',  w: 92, align: 'right' },
    ],
    s.plan_comparison.map((p) => [
      (p.recommended ? '★ ' : '') + p.plan_name,
      `${s.currency} ${fmt(p.annual_fee, 2)}`,
      fmt(p.included),
      `${s.currency} ${p.extra_cost.toFixed(2)}`,
      p.extra_transactions > 0 ? fmt(p.extra_transactions) : '—',
      `${s.currency} ${fmt(p.total_annual_cost, 2)}`,
    ]),
    y,
    { highlightRow: recIndex },
  );
  y += 6;

  // ── AI Summary ───────────────────────────────────────────────────────────────
  if (s.has_summary && s.ai_summary) {
    y = heading(doc, 'AI Summary', y);
    // Strip markdown syntax for plain-text PDF rendering
    const plain = s.ai_summary
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/^#{1,3}\s*/gm, '')
      .replace(/^\*\s*/gm, '• ')
      .trim();
    doc.fillColor(C.text).fontSize(8.5).font('Helvetica')
      .text(plain, MARGIN, y, { width: CW, lineBreak: true });
  }

  // ── Footer on every page ─────────────────────────────────────────────────────
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    footer(doc, id);
  }

  const pdfBuf = await docToBuffer(doc);

  return new Response(pdfBuf, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="scenario-${id.slice(0, 8)}.pdf"`,
      'Content-Length': String(pdfBuf.byteLength),
    },
  });
};
