import { useCallback, useState } from "react";

import {
  paFetchJsonGenerateSummaryPost,
  paScenarioSummaryBffUrl,
  scenarioIdFromScenariosPath,
} from "../lib/pa-generate-summary-client";
import { summaryMarkdownToHtml } from "../lib/pa-summary-markdown-to-html";
import { formatInputKey } from "../lib/calculator-rule-groups";
import type { ScenarioView } from "../lib/scenario-view";

declare global {
  interface Window {
    paScenarioDeleteConfirm?: (opts?: {
      clientName?: string;
    }) => Promise<boolean>;
    paScenarioDialogAlert?: (message: string) => Promise<void>;
  }
}

/** User-facing copy only; technical details go to console.error. */
const SUMMARY_GENERIC_ERROR =
  "We couldn't generate the AI summary right now. Please try again in a few minutes. If the problem continues, contact your administrator.";

const SUMMARY_AUTH_ERROR =
  "We couldn't verify your session for this action. Please sign out, sign in again, and retry.";

const SUMMARY_SIGN_IN_REQUIRED =
  "AI summary requires a full sign-in (not demo login). Use your email and password, then try again.";

async function showScenarioUserMessage(message: string): Promise<void> {
  if (typeof window.paScenarioDialogAlert === "function") {
    await window.paScenarioDialogAlert(message);
  } else {
    alert(message);
  }
}

export interface SingleScenarioProps {
  scenario: ScenarioView;
  dateDisplay: string;
  isInternal: boolean;
  scenarioFromApi: boolean;
  showSummaryBtn: boolean;
  /** From server session — false for dummy-role login (no JWT → BFF returns 401). */
  hasSupabaseToken: boolean;
}

async function readJsonBodySafe(
  res: Response,
): Promise<Record<string, unknown>> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) return {};
  if (trimmed.startsWith("<")) {
    return {
      error: "html_response",
      message:
        "Server returned HTML instead of JSON — often a login redirect. Sign in again; confirm POST goes to /api/pa/scenarios/…/generate-summary.",
    };
  }
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    return {
      error: "invalid_json",
      message: `Body was not JSON (first 120 chars): ${trimmed.slice(0, 120)}`,
    };
  }
}

const SingleScenario = ({
  scenario,
  dateDisplay,
  isInternal,
  scenarioFromApi,
  showSummaryBtn,
  hasSupabaseToken,
}: SingleScenarioProps) => {
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [copyDone, setCopyDone] = useState(false);

  if (scenario === null || scenario === undefined) {
    return;
  }

  const postGenerateSummary = useCallback(async () => {
    if (!hasSupabaseToken) {
      await showScenarioUserMessage(SUMMARY_SIGN_IN_REQUIRED);
      return;
    }
    const id =
      (typeof window !== "undefined"
        ? scenarioIdFromScenariosPath(window.location.pathname)
        : null) ?? scenario.id;
    const trimmed = id?.trim() ?? "";
    if (!trimmed) {
      await showScenarioUserMessage(SUMMARY_GENERIC_ERROR);
      console.error("[summary] missing scenario id in URL and props");
      return;
    }
    const url = paScenarioSummaryBffUrl(trimmed);
    if (!url) {
      await showScenarioUserMessage(SUMMARY_GENERIC_ERROR);
      console.error("[summary] could not build BFF URL", { trimmed });
      return;
    }
    setSummaryLoading(true);

    try {
      const response = await paFetchJsonGenerateSummaryPost(url);
      const data = await readJsonBodySafe(response);
      if (!response.ok) {
        console.error("[summary] API error", {
          status: response.status,
          body: data,
        });
        if (response.status === 401) {
          await showScenarioUserMessage(SUMMARY_AUTH_ERROR);
          return;
        }
        await showScenarioUserMessage(SUMMARY_GENERIC_ERROR);
        return;
      }
      if (typeof data.summary === "string" && data.summary.length > 0) {
        window.location.reload();
        return;
      }
      console.error("[summary] unexpected success body", data);
      await showScenarioUserMessage(SUMMARY_GENERIC_ERROR);
    } catch (err) {
      console.error("[summary] request failed", err);
      await showScenarioUserMessage(SUMMARY_GENERIC_ERROR);
    } finally {
      setSummaryLoading(false);
    }
  }, [hasSupabaseToken, scenario.id]);

  const handleCopySummary = useCallback(() => {
    const text = scenario.ai_summary;
    if (!text) return;
    void navigator.clipboard.writeText(text).then(() => {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    });
  }, [scenario.ai_summary]);

  const handleExportPdf = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/pa/scenarios/${encodeURIComponent(scenario.id)}/export-pdf`,
        { credentials: "same-origin" },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;
        const msg =
          typeof data.message === "string"
            ? data.message
            : typeof data.error === "string"
              ? data.error
              : `HTTP ${res.status}`;
        alert(`PDF download failed: ${msg}`);
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition");
      let safeName = `scenario-${scenario.id.slice(0, 8)}.pdf`;
      const quoted = cd && /filename="([^"]+)"/.exec(cd);
      if (quoted?.[1]) safeName = quoted[1];
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = safeName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("PDF download failed. Check your connection and try again.");
    }
  }, [scenario.id]);

  const handleDelete = useCallback(async () => {
    const del = window.paScenarioDeleteConfirm;
    const alertDlg = window.paScenarioDialogAlert;
    const ok =
      typeof del === "function"
        ? await del({ clientName: scenario.client_name })
        : window.confirm(
            "Delete this scenario permanently? This cannot be undone.",
          );
    if (!ok) return;
    try {
      const res = await fetch(
        `/api/pa/scenarios/${encodeURIComponent(scenario.id)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
        },
      );
      if (res.status === 204) {
        window.location.href = "/scenarios";
        return;
      }
      const data = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      const msg =
        typeof data.message === "string"
          ? data.message
          : typeof data.error === "string"
            ? data.error
            : JSON.stringify(data);
      const detail = `Delete failed (${res.status}): ${msg}`;
      if (typeof alertDlg === "function") await alertDlg(detail);
      else alert(detail);
    } catch {
      const msg = "Delete request failed. Check your connection and try again.";
      if (typeof window.paScenarioDialogAlert === "function") {
        await window.paScenarioDialogAlert(msg);
      } else {
        alert(msg);
      }
    }
  }, [scenario.client_name, scenario.id]);

  const paPct = Math.min(
    100,
    Math.round(
      (scenario.total_pa_transactions /
        scenario.recommended_plan.included_pa_transactions) *
        100,
    ),
  );
  const paWidth = Math.min(
    100,
    (scenario.total_pa_transactions /
      scenario.recommended_plan.included_pa_transactions) *
      100,
  );

  const genDisabled = summaryLoading;
  const genLabel = summaryLoading ? "…" : "Generate AI Summary";

  return (
    <div className="page-scenario-detail">
      <div className="scenario-header">
        <div className="sh-left">
          <div className="sh-meta">
            <span className="sh-id">{scenario.id}</span>
            <span className="sh-date">{dateDisplay}</span>
            {isInternal && scenario.created_by ? (
              <span className="sh-author">by {scenario.created_by}</span>
            ) : null}
          </div>
          <h2 className="sh-client">{scenario.client_name}</h2>
          <div className="sh-profile">
            <span className="sh-country">{scenario.country}</span>
            <span className="sh-sep">·</span>
            <span>{scenario.provider}</span>
            <span className="sh-sep">·</span>
            <span className="sh-version">
              Version {scenario.profile_version}
            </span>
            <span className="sh-sep">·</span>
            <span className="sh-currency">{scenario.currency}</span>
            <span className="sh-sep">·</span>
            <span className="sh-basis">{scenario.calculation_basis}</span>
          </div>
        </div>
      </div>

      <div className="scenario-actions">
        <a href={`/calculator/${scenario.profile_id}`} className="btn-recalc">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          New Calculation
        </a>

        {showSummaryBtn && !scenario.has_summary ? (
          <button
            type="button"
            className="btn-gen-summary"
            disabled={summaryLoading}
            onClick={() => void postGenerateSummary()}
          >
            <svg
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
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            {genLabel}
          </button>
        ) : null}

        {scenarioFromApi ? (
          <button
            type="button"
            className="btn-export"
            onClick={() => void handleExportPdf()}
          >
            <svg
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download PDF
          </button>
        ) : (
          <button
            type="button"
            className="btn-export"
            disabled
            title="Available when this scenario is loaded from Plan Advisor"
          >
            <svg
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download PDF
          </button>
        )}

        {scenarioFromApi ? (
          <button
            type="button"
            className="btn-delete"
            onClick={() => void handleDelete()}
          >
            <svg
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
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
            Delete
          </button>
        ) : null}
      </div>

      <div className="rec-summary-row">
        <div className="rec-card">
          <div className="rec-header">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="none"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Recommended Plan
          </div>
          <p className="rec-plan-name">{scenario.recommended_plan.plan_name}</p>
          <p className="rec-total">
            €{scenario.recommended_plan.total_annual_cost.toLocaleString()}
            <span className="rec-per">/year</span>
          </p>

          <div className="rec-breakdown">
            <div className="rec-row">
              <span>Base fee</span>
              <strong>
                €{scenario.recommended_plan.annual_fee.toLocaleString()}
              </strong>
            </div>
            <div className="rec-row">
              <span>Included PA transactions</span>
              <strong>
                {scenario.recommended_plan.included_pa_transactions.toLocaleString()}
              </strong>
            </div>
            <div className="rec-row">
              <span>Extra PA rate</span>
              <strong>
                €{scenario.recommended_plan.extra_transaction_cost.toFixed(2)}
              </strong>
            </div>
            {scenario.recommended_plan.extra_transactions > 0 ? (
              <div className="rec-row">
                <span>Extra PA consumed</span>
                <strong>
                  {scenario.recommended_plan.extra_transactions.toLocaleString()}
                </strong>
              </div>
            ) : null}
            <div className="rec-row rec-total-row">
              <span>Total extra cost</span>
              <strong>
                €
                {(
                  scenario.recommended_plan.extra_transactions *
                  scenario.recommended_plan.extra_transaction_cost
                ).toLocaleString()}
              </strong>
            </div>
          </div>

          <div className="rec-pa-bar-wrap">
            <div className="rec-pa-label">
              <span>PA Usage</span>
              <span className="pa-pct">{paPct}% of included</span>
            </div>
            <div className="rec-pa-track">
              <div className="rec-pa-fill" style={{ width: `${paWidth}%` }} />
            </div>
          </div>
        </div>

        <div className="summary-block" id="summary-block">
          <div className="summary-header">
            <div className="summary-title-row">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <span className="summary-title">AI Summary</span>
              {scenario.has_summary ? (
                <span className="summary-ready-badge">Ready</span>
              ) : null}
            </div>
            <p className="summary-desc">
              Analysis of the top plan options for this scenario, generated by
              Agente Resumen (DSPy).
            </p>
          </div>

          {scenario.has_summary && scenario.ai_summary ? (
            <div className="summary-body">
              <div
                className="summary-text summary-text-md"
                id="summary-text"
                dangerouslySetInnerHTML={{
                  __html: summaryMarkdownToHtml(scenario.ai_summary),
                }}
              />
              <div className="summary-footer">
                <button
                  type="button"
                  className="btn-copy"
                  id="btn-copy"
                  onClick={handleCopySummary}
                >
                  <svg
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
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  {copyDone ? "✓ Copied!" : "Copy Summary"}
                </button>
                {showSummaryBtn ? (
                  <button
                    type="button"
                    className="btn-regen"
                    disabled={genDisabled}
                    onClick={() => void postGenerateSummary()}
                  >
                    {summaryLoading ? "…" : "Regenerate"}
                  </button>
                ) : null}
              </div>
            </div>
          ) : showSummaryBtn ? (
            <div className="summary-empty">
              <p className="summary-empty-text">
                No AI summary has been generated yet for this scenario.
              </p>
              <button
                type="button"
                className="btn-gen-lg"
                disabled={summaryLoading}
                onClick={() => void postGenerateSummary()}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                {genLabel}
              </button>
            </div>
          ) : (
            <div className="summary-empty">
              <p className="summary-empty-text">
                AI summaries are not enabled for your account. Contact your
                administrator.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <section className="detail-block">
            <h3 className="block-heading">Input Summary</h3>
            <div className="inputs-grid">
              {scenario.calculator_form?.groups?.length
                ? scenario.calculator_form.groups.map((g, gi) => {
                    const v =
                      g.input_keys.length > 0
                        ? (scenario.inputs[g.input_keys[0]!] ?? 0)
                        : 0;
                    return (
                      <div
                        key={`${g.display_label}-${gi}`}
                        className="input-chip"
                      >
                        <p className="input-key">{g.display_label}</p>
                        <p className="input-val">{v.toLocaleString()}</p>
                      </div>
                    );
                  })
                : Object.entries(scenario.inputs).map(([key, val]) => (
                    <div key={key} className="input-chip">
                      <p className="input-key">{formatInputKey(key)}</p>
                      <p className="input-val">{val.toLocaleString()}</p>
                    </div>
                  ))}
            </div>
          </section>

          <section className="detail-block">
            <h3 className="block-heading">Transaction Breakdown</h3>
            <div className="table-wrap">
              <table className="dtable">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Direction</th>
                    <th>Obligation</th>
                    <th className="num">Volume</th>
                    <th className="num">× Multiplier</th>
                    <th className="num">PA Transactions</th>
                  </tr>
                </thead>
                <tbody>
                  {scenario.transaction_breakdown.map((row, ri) => (
                    <tr key={`${row.label}-${ri}`}>
                      <td className="row-label">
                        <div className="type-cell">
                          <span className="type-main">{row.label}</span>
                          {row.detail_label ? (
                            <span className="type-detail">
                              {row.detail_label}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`dir-tag ${
                            row.direction === "Issued"
                              ? "dir-issued"
                              : "dir-received"
                          }`}
                        >
                          {row.direction}
                        </span>
                      </td>
                      <td>
                        <span className="obl-tag">{row.obligation}</span>
                      </td>
                      <td className="num muted">
                        {row.volume.toLocaleString()}
                      </td>
                      <td className="num">
                        <span className="mult-val">×{row.multiplier}</span>
                      </td>
                      <td className="num bold">
                        {row.pa_transactions.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="total-row">
                    <td colSpan={5} className="total-label">
                      Total PA Transactions / year
                    </td>
                    <td className="num total-val">
                      {scenario.total_pa_transactions.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section className="detail-block">
            <h3 className="block-heading">Plan Comparison</h3>
            <div className="table-wrap">
              <table className="dtable">
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th className="num">Annual Fee</th>
                    <th className="num">Included PA</th>
                    <th className="num">Extra / PA</th>
                    <th className="num">Extra PA Used</th>
                    <th className="num">Total / Year</th>
                  </tr>
                </thead>
                <tbody>
                  {scenario.plan_comparison.map((plan, pi) => (
                    <tr
                      key={`${plan.plan_name}-${pi}`}
                      className={`plan-row ${
                        plan.recommended ? "plan-rec" : ""
                      }`}
                    >
                      <td>
                        <div className="plan-cell">
                          {plan.recommended ? (
                            <span className="rec-star">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="11"
                                height="11"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                stroke="none"
                              >
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                              </svg>
                            </span>
                          ) : null}
                          <span
                            className={`plan-name ${
                              plan.recommended ? "plan-name-rec" : ""
                            }`}
                          >
                            {plan.plan_name}
                          </span>
                          {plan.recommended ? (
                            <span className="rec-label">Recommended</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="num">
                        €{plan.annual_fee.toLocaleString()}
                      </td>
                      <td className="num muted">
                        {plan.included.toLocaleString()}
                      </td>
                      <td className="num muted">
                        €{plan.extra_cost.toFixed(2)}
                      </td>
                      <td className="num muted">
                        {plan.extra_transactions > 0
                          ? plan.extra_transactions.toLocaleString()
                          : "—"}
                      </td>
                      <td className="num">
                        <strong
                          className={plan.recommended ? "rec-cost" : undefined}
                        >
                          €{plan.total_annual_cost.toLocaleString()}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {scenario.assumptions.length > 0 ? (
            <section className="detail-block">
              <h3 className="block-heading">Business Assumptions</h3>
              <ul className="assumptions-list">
                {scenario.assumptions.map((a) => (
                  <li key={`${a.key}-${a.value}`} className="assumption-item">
                    <span className="assumption-key">
                      {a.key.replace(/_/g, " ")}
                    </span>
                    <span className="assumption-val">{a.value}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default SingleScenario;
