import { c as createComponent } from './astro-component_CFbB7t5t.mjs';
import 'piccolore';
import { h as renderComponent, r as renderTemplate, m as maybeRenderHead, f as addAttribute } from './server_5UhKKJIi.mjs';
import { $ as $$AdminLayout } from './AdminLayout_DbV7Wfno.mjs';
import { g as getSession } from './session_DDm0LoiA.mjs';
import { a as DUMMY_ANALYSES } from './dummy-data_cO8F-nc4.mjs';

const $$Index = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$Index;
  const session = getSession(Astro2.cookies);
  if (!session || session.role !== "admin") return Astro2.redirect("/admin/login");
  return renderTemplate`${renderComponent($$result, "AdminLayout", $$AdminLayout, { "title": "AI Analyses", "breadcrumbs": [{ label: "Admin" }, { label: "AI Analyses" }], "data-astro-cid-4b5qjkrf": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="panel" data-astro-cid-4b5qjkrf> <table class="table" data-astro-cid-4b5qjkrf> <thead data-astro-cid-4b5qjkrf> <tr data-astro-cid-4b5qjkrf> <th data-astro-cid-4b5qjkrf>Country / Provider</th> <th data-astro-cid-4b5qjkrf>Date</th> <th data-astro-cid-4b5qjkrf>Rules</th> <th data-astro-cid-4b5qjkrf>Plans</th> <th data-astro-cid-4b5qjkrf>Pending Review</th> <th data-astro-cid-4b5qjkrf>Status</th> <th data-astro-cid-4b5qjkrf></th> </tr> </thead> <tbody data-astro-cid-4b5qjkrf> ${DUMMY_ANALYSES.map((a) => renderTemplate`<tr data-astro-cid-4b5qjkrf> <td class="bold" data-astro-cid-4b5qjkrf>${a.country} / ${a.provider}</td> <td class="muted" data-astro-cid-4b5qjkrf>${a.created_at}</td> <td data-astro-cid-4b5qjkrf>${a.rules_proposed} proposed · <span class="green" data-astro-cid-4b5qjkrf>${a.rules_approved} approved</span></td> <td data-astro-cid-4b5qjkrf>${a.plans_proposed} proposed · <span class="green" data-astro-cid-4b5qjkrf>${a.plans_approved} approved</span></td> <td data-astro-cid-4b5qjkrf> ${a.pending_review > 0 ? renderTemplate`<span class="badge badge-amber" data-astro-cid-4b5qjkrf>${a.pending_review} pending</span>` : renderTemplate`<span class="badge badge-green" data-astro-cid-4b5qjkrf>All reviewed</span>`} </td> <td data-astro-cid-4b5qjkrf> ${a.status === "pending_review" ? renderTemplate`<span class="badge badge-amber" data-astro-cid-4b5qjkrf>Needs review</span>` : renderTemplate`<span class="badge badge-green" data-astro-cid-4b5qjkrf>Completed</span>`} </td> <td data-astro-cid-4b5qjkrf> <a${addAttribute(`/admin/analyses/${a.id}`, "href")} class="btn-action" data-astro-cid-4b5qjkrf> ${a.status === "pending_review" ? "Review →" : "View →"} </a> </td> </tr>`)} </tbody> </table> </div> ` })}`;
}, "/Users/macnolo/Desktop/Code/b2brouter-calculator/src/pages/admin/analyses/index.astro", void 0);

const $$file = "/Users/macnolo/Desktop/Code/b2brouter-calculator/src/pages/admin/analyses/index.astro";
const $$url = "/admin/analyses";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
