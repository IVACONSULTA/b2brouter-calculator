import { c as createComponent } from './astro-component_CFbB7t5t.mjs';
import 'piccolore';
import { h as renderComponent, r as renderTemplate, m as maybeRenderHead, f as addAttribute } from './server_5UhKKJIi.mjs';
import { r as renderScript } from './script_DccjArJC.mjs';
import { $ as $$AdminLayout } from './AdminLayout_DbV7Wfno.mjs';
import { g as getSession } from './session_DDm0LoiA.mjs';
import { D as DUMMY_ANALYSIS_DETAIL } from './dummy-data_cO8F-nc4.mjs';

const $$id = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$id;
  const session = getSession(Astro2.cookies);
  if (!session || session.role !== "admin") return Astro2.redirect("/admin/login");
  const { id } = Astro2.params;
  const analysis = DUMMY_ANALYSIS_DETAIL;
  const confidenceMeta = {
    high: { cls: "conf-high", label: "High" },
    medium: { cls: "conf-medium", label: "Medium" },
    low: { cls: "conf-low", label: "Low" }
  };
  const ruleSummary = {
    approved: analysis.rules.filter((r) => r.status === "approved").length,
    proposed: analysis.rules.filter((r) => r.status === "proposed").length,
    pending: analysis.rules.filter((r) => r.status === "pending_confirmation").length,
    rejected: analysis.rules.filter((r) => r.status === "rejected").length
  };
  const planSummary = {
    approved: analysis.plans.filter((p) => p.status === "approved").length,
    proposed: analysis.plans.filter((p) => p.status === "proposed").length
  };
  return renderTemplate`${renderComponent($$result, "AdminLayout", $$AdminLayout, { "title": `Analysis — ${analysis.country} / ${analysis.provider}`, "breadcrumbs": [
    { label: "AI Analyses", href: "/admin/analyses" },
    { label: `${analysis.country} / ${analysis.provider} ${analysis.version}` }
  ], "data-astro-cid-kmh3sjlk": true }, { "default": ($$result2) => renderTemplate`  ${maybeRenderHead()}<div class="guardrail-row" data-astro-cid-kmh3sjlk> <div class="guardrail-item passed" data-astro-cid-kmh3sjlk> <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-kmh3sjlk> <polyline points="20 6 9 17 4 12" data-astro-cid-kmh3sjlk></polyline> </svg>
EU AI Act check: <strong data-astro-cid-kmh3sjlk>passed</strong> </div> <div class="guardrail-item passed" data-astro-cid-kmh3sjlk> <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-kmh3sjlk> <polyline points="20 6 9 17 4 12" data-astro-cid-kmh3sjlk></polyline> </svg>
Copyright check: <strong data-astro-cid-kmh3sjlk>passed</strong> </div> ${analysis.guardrail_audit.blocked_documents.length > 0 && renderTemplate`<div class="guardrail-item warn" data-astro-cid-kmh3sjlk> <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-kmh3sjlk> <circle cx="12" cy="12" r="10" data-astro-cid-kmh3sjlk></circle><line x1="12" y1="8" x2="12" y2="12" data-astro-cid-kmh3sjlk></line><line x1="12" y1="16" x2="12.01" y2="16" data-astro-cid-kmh3sjlk></line> </svg> ${analysis.guardrail_audit.blocked_documents.length} doc(s) excluded (AI opt-out)
</div>`} <div class="guardrail-meta" data-astro-cid-kmh3sjlk>
Processing ID: <code data-astro-cid-kmh3sjlk>${analysis.guardrail_audit.processing_id}</code> · ${new Date(analysis.guardrail_audit.processing_timestamp).toLocaleString()} </div> </div>  <div class="summary-card" data-astro-cid-kmh3sjlk> <div class="summary-left" data-astro-cid-kmh3sjlk> <h2 class="summary-title" data-astro-cid-kmh3sjlk>Analysis Summary</h2> <p class="summary-text" data-astro-cid-kmh3sjlk>${analysis.summary}</p> </div> <div class="summary-stats" data-astro-cid-kmh3sjlk> <div class="stat-pill" data-astro-cid-kmh3sjlk> <span class="sp-val" data-astro-cid-kmh3sjlk>${ruleSummary.approved}</span> <span class="sp-label" data-astro-cid-kmh3sjlk>Approved rules</span> </div> <div class="stat-pill warn" data-astro-cid-kmh3sjlk> <span class="sp-val" data-astro-cid-kmh3sjlk>${ruleSummary.proposed + ruleSummary.pending}</span> <span class="sp-label" data-astro-cid-kmh3sjlk>Pending review</span> </div> <div class="stat-pill err" data-astro-cid-kmh3sjlk> <span class="sp-val" data-astro-cid-kmh3sjlk>${ruleSummary.rejected}</span> <span class="sp-label" data-astro-cid-kmh3sjlk>Rejected</span> </div> <div class="stat-pill green" data-astro-cid-kmh3sjlk> <span class="sp-val" data-astro-cid-kmh3sjlk>${planSummary.approved}</span> <span class="sp-label" data-astro-cid-kmh3sjlk>Approved plans</span> </div> </div> </div>  <section class="section" data-astro-cid-kmh3sjlk> <div class="section-head" data-astro-cid-kmh3sjlk> <h2 class="section-title" data-astro-cid-kmh3sjlk>Transaction Rules</h2> <div class="section-actions" data-astro-cid-kmh3sjlk> <!-- TODO: POST /admin/rules/bulk-approve via App 2 API --> <button class="btn-bulk-approve" onclick="handleBulkApprove()" data-astro-cid-kmh3sjlk>
Approve all proposed
</button> </div> </div> <div class="rules-list" data-astro-cid-kmh3sjlk> ${analysis.rules.map((rule) => renderTemplate`<div${addAttribute(`rule-card status-${rule.status}`, "class")}${addAttribute(`rule-${rule.id}`, "id")} data-astro-cid-kmh3sjlk> <div class="rule-head" data-astro-cid-kmh3sjlk> <div class="rule-meta" data-astro-cid-kmh3sjlk> <span${addAttribute(`status-pill sp-${rule.status}`, "class")} data-astro-cid-kmh3sjlk>${rule.status.replace("_", " ")}</span> <span${addAttribute(`conf-badge ${confidenceMeta[rule.confidence].cls}`, "class")} data-astro-cid-kmh3sjlk> ${confidenceMeta[rule.confidence].label} confidence
</span> ${rule.manually_edited && renderTemplate`<span class="edited-tag" data-astro-cid-kmh3sjlk>Edited</span>`} </div> <div class="rule-actions" data-astro-cid-kmh3sjlk> ${rule.status !== "approved" && renderTemplate`<!-- TODO: POST /admin/rules/{rule.id}/approve via App 2 API -->
                <button class="btn-approve"${addAttribute(rule.id, "data-rule-id")}${addAttribute(`handleApprove('${rule.id}')`, "onclick")} data-astro-cid-kmh3sjlk>
Approve
</button>`} <!-- TODO: PATCH /admin/rules/{rule.id} via App 2 API (edit modal) --> <button class="btn-edit"${addAttribute(rule.id, "data-rule-id")}${addAttribute(`handleEdit('${rule.id}')`, "onclick")} data-astro-cid-kmh3sjlk>
Edit
</button> ${rule.status !== "rejected" && renderTemplate`<!-- TODO: POST /admin/rules/{rule.id}/reject via App 2 API -->
                <button class="btn-reject"${addAttribute(rule.id, "data-rule-id")}${addAttribute(`handleReject('${rule.id}')`, "onclick")} data-astro-cid-kmh3sjlk>
Reject
</button>`} ${rule.status === "rejected" && renderTemplate`<!-- TODO: POST /admin/rules/{rule.id}/restore via App 2 API -->
                <button class="btn-restore"${addAttribute(rule.id, "data-rule-id")}${addAttribute(`handleRestore('${rule.id}')`, "onclick")} data-astro-cid-kmh3sjlk>
Restore
</button>`} ${(rule.status === "proposed" || rule.status === "rejected") && renderTemplate`<button class="btn-pending"${addAttribute(rule.id, "data-rule-id")}${addAttribute(`handleMarkPending('${rule.id}')`, "onclick")} data-astro-cid-kmh3sjlk>
Mark as pending
</button>`} </div> </div> <div class="rule-body" data-astro-cid-kmh3sjlk> <div class="rule-main" data-astro-cid-kmh3sjlk> <div class="rule-name" data-astro-cid-kmh3sjlk>${rule.label}</div> <div class="rule-details" data-astro-cid-kmh3sjlk> <span class="detail-pill" data-astro-cid-kmh3sjlk>${rule.direction}</span> <span class="detail-pill" data-astro-cid-kmh3sjlk>${rule.obligation}</span> <span class="detail-pill" data-astro-cid-kmh3sjlk>${rule.operation_group}</span> <span class="detail-key" data-astro-cid-kmh3sjlk>key: <code data-astro-cid-kmh3sjlk>${rule.input_key}</code></span> </div> <div class="rule-multiplier" data-astro-cid-kmh3sjlk> <span class="multiplier-label" data-astro-cid-kmh3sjlk>PA transactions per item:</span> <span class="multiplier-value" data-astro-cid-kmh3sjlk>${rule.pa_transactions_per_item}×</span> </div> <p class="rule-reason" data-astro-cid-kmh3sjlk>${rule.reason}</p> </div> <div class="rule-source" data-astro-cid-kmh3sjlk> <div class="source-header" data-astro-cid-kmh3sjlk> <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-kmh3sjlk> <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" data-astro-cid-kmh3sjlk></path> <polyline points="14 2 14 8 20 8" data-astro-cid-kmh3sjlk></polyline> </svg> ${rule.source_document} </div> <blockquote class="source-excerpt" data-astro-cid-kmh3sjlk>"${rule.source_excerpt}"</blockquote> </div> </div> </div>`)} </div> </section>  <section class="section" data-astro-cid-kmh3sjlk> <div class="section-head" data-astro-cid-kmh3sjlk> <h2 class="section-title" data-astro-cid-kmh3sjlk>Extracted Plans</h2> <div class="section-actions" data-astro-cid-kmh3sjlk> <!-- TODO: POST /admin/plans/bulk-approve via App 2 API --> <button class="btn-bulk-approve" onclick="handleBulkApprovePlans()" data-astro-cid-kmh3sjlk>
Approve all proposed plans
</button> </div> </div> <div class="plans-grid" data-astro-cid-kmh3sjlk> ${analysis.plans.map((plan) => renderTemplate`<div${addAttribute(`plan-card pstatus-${plan.status}`, "class")} data-astro-cid-kmh3sjlk> <div class="plan-head" data-astro-cid-kmh3sjlk> <h3 class="plan-name" data-astro-cid-kmh3sjlk>${plan.plan_name}</h3> <div class="plan-meta" data-astro-cid-kmh3sjlk> <span${addAttribute(`status-pill sp-${plan.status}`, "class")} data-astro-cid-kmh3sjlk>${plan.status}</span> <span${addAttribute(`conf-badge ${confidenceMeta[plan.confidence].cls}`, "class")} data-astro-cid-kmh3sjlk>${confidenceMeta[plan.confidence].label}</span> </div> </div> <div class="plan-pricing" data-astro-cid-kmh3sjlk> <div class="pricing-row" data-astro-cid-kmh3sjlk> <span class="pr-label" data-astro-cid-kmh3sjlk>Annual fee</span> <span class="pr-value" data-astro-cid-kmh3sjlk>€${plan.annual_fee.toLocaleString()}/yr</span> </div> <div class="pricing-row" data-astro-cid-kmh3sjlk> <span class="pr-label" data-astro-cid-kmh3sjlk>Monthly equivalent</span> <span class="pr-value" data-astro-cid-kmh3sjlk>€${plan.monthly_fee}/mo</span> </div> <div class="pricing-row" data-astro-cid-kmh3sjlk> <span class="pr-label" data-astro-cid-kmh3sjlk>Included PA transactions</span> <span class="pr-value" data-astro-cid-kmh3sjlk>${plan.included_pa_transactions.toLocaleString()}</span> </div> <div class="pricing-row highlight" data-astro-cid-kmh3sjlk> <span class="pr-label" data-astro-cid-kmh3sjlk>Extra transaction cost</span> <span class="pr-value" data-astro-cid-kmh3sjlk>€${plan.extra_transaction_cost}/transaction</span> </div> </div> <blockquote class="source-excerpt small" data-astro-cid-kmh3sjlk>"${plan.source_excerpt}"</blockquote> <div class="plan-actions" data-astro-cid-kmh3sjlk> ${plan.status !== "approved" && renderTemplate`<!-- TODO: POST /admin/plans/{plan.id}/approve via App 2 API -->
              <button class="btn-approve"${addAttribute(`handleApprovePlan('${plan.id}')`, "onclick")} data-astro-cid-kmh3sjlk>Approve</button>`} <!-- TODO: PATCH /admin/plans/{plan.id} via App 2 API --> <button class="btn-edit"${addAttribute(`handleEditPlan('${plan.id}')`, "onclick")} data-astro-cid-kmh3sjlk>Edit</button> ${plan.status !== "rejected" && renderTemplate`<!-- TODO: POST /admin/plans/{plan.id}/reject via App 2 API -->
              <button class="btn-reject"${addAttribute(`handleRejectPlan('${plan.id}')`, "onclick")} data-astro-cid-kmh3sjlk>Reject</button>`} </div> </div>`)} </div> </section>  <section class="section" data-astro-cid-kmh3sjlk> <h2 class="section-title" data-astro-cid-kmh3sjlk>Business Assumptions</h2> <div class="assumptions-list" data-astro-cid-kmh3sjlk> ${analysis.assumptions.map((assumption) => renderTemplate`<div class="assumption-card" data-astro-cid-kmh3sjlk> <div class="assumption-head" data-astro-cid-kmh3sjlk> <div data-astro-cid-kmh3sjlk> <span class="assumption-key" data-astro-cid-kmh3sjlk>${assumption.key}</span> <span class="assumption-value" data-astro-cid-kmh3sjlk>${assumption.value}</span> </div> <div class="assumption-actions" data-astro-cid-kmh3sjlk> <span${addAttribute(`status-pill sp-${assumption.status}`, "class")} data-astro-cid-kmh3sjlk>${assumption.status}</span> ${assumption.status !== "approved" && renderTemplate`<!-- TODO: POST /admin/assumptions/{assumption.id}/approve via App 2 API -->
                <button class="btn-approve sm"${addAttribute(`handleApproveAssumption('${assumption.id}')`, "onclick")} data-astro-cid-kmh3sjlk>Approve</button>`} <!-- TODO: POST /admin/assumptions/{assumption.id}/reject via App 2 API --> <button class="btn-reject sm"${addAttribute(`handleRejectAssumption('${assumption.id}')`, "onclick")} data-astro-cid-kmh3sjlk>Reject</button> </div> </div> <p class="assumption-reason" data-astro-cid-kmh3sjlk>${assumption.reason}</p> <p class="assumption-source" data-astro-cid-kmh3sjlk>Source: ${assumption.source_document}</p> </div>`)} </div> </section>  ${analysis.ambiguities.length > 0 && renderTemplate`<section class="section" data-astro-cid-kmh3sjlk> <h2 class="section-title" data-astro-cid-kmh3sjlk>Ambiguities</h2> <div class="ambiguity-list" data-astro-cid-kmh3sjlk> ${analysis.ambiguities.map((amb) => renderTemplate`<div class="ambiguity-card" data-astro-cid-kmh3sjlk> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-kmh3sjlk> <circle cx="12" cy="12" r="10" data-astro-cid-kmh3sjlk></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" data-astro-cid-kmh3sjlk></path><line x1="12" y1="17" x2="12.01" y2="17" data-astro-cid-kmh3sjlk></line> </svg> <div data-astro-cid-kmh3sjlk> <p class="ambiguity-desc" data-astro-cid-kmh3sjlk>${amb.description}</p> <p class="ambiguity-meta" data-astro-cid-kmh3sjlk>
Affected rules: ${amb.affected_rules.join(", ")} ·
                Sources: ${amb.source_documents.join(", ")} </p> </div> </div>`)} </div> </section>`} ${analysis.conflicts.length === 0 && renderTemplate`<div class="no-conflicts" data-astro-cid-kmh3sjlk> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-kmh3sjlk> <polyline points="20 6 9 17 4 12" data-astro-cid-kmh3sjlk></polyline> </svg>
No critical conflicts detected between rules or plans.
</div>`} <div class="footer-actions" data-astro-cid-kmh3sjlk> <a href="/countries" class="btn-secondary" data-astro-cid-kmh3sjlk>Back to Countries</a> <a${addAttribute(`/admin/profiles/${analysis.profile_id}`, "href")} class="btn-primary" data-astro-cid-kmh3sjlk>
Proceed to Profile Activation →
</a> </div> ` })} ${renderScript($$result, "/Users/macnolo/Desktop/Code/b2brouter-calculator/src/pages/admin/analyses/[id].astro?astro&type=script&index=0&lang.ts")}`;
}, "/Users/macnolo/Desktop/Code/b2brouter-calculator/src/pages/admin/analyses/[id].astro", void 0);

const $$file = "/Users/macnolo/Desktop/Code/b2brouter-calculator/src/pages/admin/analyses/[id].astro";
const $$url = "/admin/analyses/[id]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$id,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
