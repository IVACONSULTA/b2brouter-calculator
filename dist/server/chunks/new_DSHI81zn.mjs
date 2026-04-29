import { c as createComponent } from './astro-component_CFbB7t5t.mjs';
import 'piccolore';
import { h as renderComponent, r as renderTemplate, m as maybeRenderHead, f as addAttribute } from './server_5UhKKJIi.mjs';
import { r as renderScript } from './script_DccjArJC.mjs';
import { $ as $$AdminLayout } from './AdminLayout_DbV7Wfno.mjs';
import { g as getSession } from './session_DDm0LoiA.mjs';

const $$New = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$New;
  const session = getSession(Astro2.cookies);
  if (!session || session.role !== "admin") return Astro2.redirect("/admin/login");
  const countries = [
    { code: "FR", name: "France" },
    { code: "ES", name: "Spain" },
    { code: "DE", name: "Germany" },
    { code: "IT", name: "Italy" },
    { code: "PT", name: "Portugal" },
    { code: "NL", name: "Netherlands" },
    { code: "BE", name: "Belgium" },
    { code: "PL", name: "Poland" },
    { code: "RO", name: "Romania" },
    { code: "GR", name: "Greece" }
  ];
  const providers = [
    { name: "B2Brouter", type: "PA" },
    { name: "SAP DRC", type: "PA" },
    { name: "Aruba PEC", type: "PDP" },
    { name: "InfoCert", type: "PDP" },
    { name: "Chorus Pro", type: "PA" },
    { name: "Peppol", type: "PA" }
  ];
  const currencies = ["EUR", "GBP", "PLN", "RON"];
  return renderTemplate`${renderComponent($$result, "AdminLayout", $$AdminLayout, { "title": "New Country / Provider", "breadcrumbs": [
    { label: "Countries", href: "/countries" },
    { label: "New Country / Provider" }
  ], "data-astro-cid-jn2t4yvv": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="form-layout" data-astro-cid-jn2t4yvv> <!-- Main form --> <div class="form-card" data-astro-cid-jn2t4yvv> <div class="card-header" data-astro-cid-jn2t4yvv> <h2 data-astro-cid-jn2t4yvv>Country & Provider Details</h2> <p data-astro-cid-jn2t4yvv>Create a new calculation profile. You'll be able to upload documents and configure rules in the next steps.</p> </div> <!-- TODO: POST /api/admin/countries → App 2 POST /admin/countries --> <form id="new-country-form" class="form" action="#" method="POST" data-astro-cid-jn2t4yvv> <div class="form-grid" data-astro-cid-jn2t4yvv> <div class="field" data-astro-cid-jn2t4yvv> <label for="country_code" data-astro-cid-jn2t4yvv>Country <span class="required" data-astro-cid-jn2t4yvv>*</span></label> <select id="country_code" name="country_code" required data-astro-cid-jn2t4yvv> <option value="" disabled selected data-astro-cid-jn2t4yvv>Select country…</option> ${countries.map((c) => renderTemplate`<option${addAttribute(c.code, "value")} data-astro-cid-jn2t4yvv>${c.name} (${c.code})</option>`)} </select> </div> <div class="field" data-astro-cid-jn2t4yvv> <label for="provider" data-astro-cid-jn2t4yvv>Provider / PA <span class="required" data-astro-cid-jn2t4yvv>*</span></label> <select id="provider" name="provider" required data-astro-cid-jn2t4yvv> <option value="" disabled selected data-astro-cid-jn2t4yvv>Select provider…</option> ${providers.map((p) => renderTemplate`<option${addAttribute(p.name, "value")} data-astro-cid-jn2t4yvv>${p.name} — ${p.type}</option>`)} <option value="__custom__" data-astro-cid-jn2t4yvv>+ Custom provider…</option> </select> </div> <div class="field" id="custom-provider-wrap" style="display:none" data-astro-cid-jn2t4yvv> <label for="provider_custom" data-astro-cid-jn2t4yvv>Custom Provider Name <span class="required" data-astro-cid-jn2t4yvv>*</span></label> <input type="text" id="provider_custom" name="provider_custom" placeholder="e.g. MyPA Platform" data-astro-cid-jn2t4yvv> </div> <div class="field" id="custom-type-wrap" style="display:none" data-astro-cid-jn2t4yvv> <label for="provider_type" data-astro-cid-jn2t4yvv>Provider Type</label> <select id="provider_type" name="provider_type" data-astro-cid-jn2t4yvv> <option value="PA" data-astro-cid-jn2t4yvv>PA (Plataforma de Acceso)</option> <option value="PDP" data-astro-cid-jn2t4yvv>PDP (Plateforme de Dématérialisation Partenaire)</option> <option value="other" data-astro-cid-jn2t4yvv>Other</option> </select> </div> <div class="field" data-astro-cid-jn2t4yvv> <label for="currency" data-astro-cid-jn2t4yvv>Currency <span class="required" data-astro-cid-jn2t4yvv>*</span></label> <select id="currency" name="currency" required data-astro-cid-jn2t4yvv> ${currencies.map((c) => renderTemplate`<option${addAttribute(c, "value")}${addAttribute(c === "EUR", "selected")} data-astro-cid-jn2t4yvv>${c}</option>`)} </select> </div> <div class="field" data-astro-cid-jn2t4yvv> <label for="version" data-astro-cid-jn2t4yvv>Initial Version</label> <input type="text" id="version" name="version" value="v1.0" placeholder="v1.0" data-astro-cid-jn2t4yvv> <span class="field-hint" data-astro-cid-jn2t4yvv>Profile version identifier, e.g. v1.0, v2.1</span> </div> <div class="field full-width" data-astro-cid-jn2t4yvv> <label for="calculation_basis" data-astro-cid-jn2t4yvv>Calculation Basis</label> <input type="text" id="calculation_basis" name="calculation_basis" value="PA transactions" placeholder="PA transactions" data-astro-cid-jn2t4yvv> <span class="field-hint" data-astro-cid-jn2t4yvv>Unit used for the deterministic calculation (defined by the provider)</span> </div> <div class="field full-width" data-astro-cid-jn2t4yvv> <label for="notes" data-astro-cid-jn2t4yvv>Notes</label> <textarea id="notes" name="notes" rows="3" placeholder="Any relevant context about this country / provider configuration…" data-astro-cid-jn2t4yvv></textarea> </div> </div> <div class="form-actions" data-astro-cid-jn2t4yvv> <a href="/countries" class="btn-cancel" data-astro-cid-jn2t4yvv>Cancel</a> <button type="submit" class="btn-primary" id="submit-btn" data-astro-cid-jn2t4yvv>
Create profile & continue to setup
<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-jn2t4yvv> <path d="M5 12h14M12 5l7 7-7 7" data-astro-cid-jn2t4yvv></path> </svg> </button> </div> </form> </div> <!-- Side info --> <aside class="side-info" data-astro-cid-jn2t4yvv> <div class="info-card" data-astro-cid-jn2t4yvv> <h3 data-astro-cid-jn2t4yvv>Setup workflow</h3> <ol class="steps" data-astro-cid-jn2t4yvv> <li class="step active" data-astro-cid-jn2t4yvv> <div class="step-num" data-astro-cid-jn2t4yvv>1</div> <div data-astro-cid-jn2t4yvv> <p class="step-title" data-astro-cid-jn2t4yvv>Create profile</p> <p class="step-desc" data-astro-cid-jn2t4yvv>Country + Provider + Currency</p> </div> </li> <li class="step" data-astro-cid-jn2t4yvv> <div class="step-num" data-astro-cid-jn2t4yvv>2</div> <div data-astro-cid-jn2t4yvv> <p class="step-title" data-astro-cid-jn2t4yvv>Upload documents</p> <p class="step-desc" data-astro-cid-jn2t4yvv>Pricing sheets, legal decrees, contracts</p> </div> </li> <li class="step" data-astro-cid-jn2t4yvv> <div class="step-num" data-astro-cid-jn2t4yvv>3</div> <div data-astro-cid-jn2t4yvv> <p class="step-title" data-astro-cid-jn2t4yvv>AI analysis</p> <p class="step-desc" data-astro-cid-jn2t4yvv>Extract rules & plans from documents</p> </div> </li> <li class="step" data-astro-cid-jn2t4yvv> <div class="step-num" data-astro-cid-jn2t4yvv>4</div> <div data-astro-cid-jn2t4yvv> <p class="step-title" data-astro-cid-jn2t4yvv>Review & approve</p> <p class="step-desc" data-astro-cid-jn2t4yvv>Approve rules and plans individually</p> </div> </li> <li class="step" data-astro-cid-jn2t4yvv> <div class="step-num" data-astro-cid-jn2t4yvv>5</div> <div data-astro-cid-jn2t4yvv> <p class="step-title" data-astro-cid-jn2t4yvv>Activate profile</p> <p class="step-desc" data-astro-cid-jn2t4yvv>Make it available to customers</p> </div> </li> </ol> </div> <div class="info-card warn" data-astro-cid-jn2t4yvv> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-jn2t4yvv> <circle cx="12" cy="12" r="10" data-astro-cid-jn2t4yvv></circle><line x1="12" y1="8" x2="12" y2="12" data-astro-cid-jn2t4yvv></line><line x1="12" y1="16" x2="12.01" y2="16" data-astro-cid-jn2t4yvv></line> </svg> <div data-astro-cid-jn2t4yvv> <p class="warn-title" data-astro-cid-jn2t4yvv>Only one active version per profile</p> <p class="warn-desc" data-astro-cid-jn2t4yvv>When activating this version, any previously active version for the same country/provider will be archived automatically.</p> </div> </div> </aside> </div> ` })} ${renderScript($$result, "/Users/macnolo/Desktop/Code/b2brouter-calculator/src/pages/admin/countries/new.astro?astro&type=script&index=0&lang.ts")}`;
}, "/Users/macnolo/Desktop/Code/b2brouter-calculator/src/pages/admin/countries/new.astro", void 0);

const $$file = "/Users/macnolo/Desktop/Code/b2brouter-calculator/src/pages/admin/countries/new.astro";
const $$url = "/admin/countries/new";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$New,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
