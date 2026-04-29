import { c as createComponent } from './astro-component_CFbB7t5t.mjs';
import 'piccolore';
import { h as renderComponent, r as renderTemplate, m as maybeRenderHead, f as addAttribute } from './server_5UhKKJIi.mjs';
import { $ as $$AdminLayout } from './AdminLayout_DbV7Wfno.mjs';
import { g as getSession } from './session_DDm0LoiA.mjs';
import { b as DUMMY_PROFILES } from './dummy-data_cO8F-nc4.mjs';

const $$Setup = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$Setup;
  const session = getSession(Astro2.cookies);
  if (!session || session.role !== "admin") return Astro2.redirect("/admin/login");
  const { id } = Astro2.params;
  const profile = DUMMY_PROFILES.find((p) => p.id === id) ?? DUMMY_PROFILES[2];
  return renderTemplate`${renderComponent($$result, "AdminLayout", $$AdminLayout, { "title": `Setup — ${profile.country.name} / ${profile.provider.name}`, "breadcrumbs": [
    { label: "Countries", href: "/countries" },
    { label: `${profile.country.name} / ${profile.provider.name}` },
    { label: "Setup" }
  ], "data-astro-cid-6wliktcd": true }, { "default": ($$result2) => renderTemplate`  ${maybeRenderHead()}<div class="step-bar" data-astro-cid-6wliktcd> <a${addAttribute(`/admin/countries/${profile.id}/setup`, "href")} class="step-tab active" data-astro-cid-6wliktcd> <span class="step-num" data-astro-cid-6wliktcd>1</span> Profile Setup
</a> <div class="step-connector" data-astro-cid-6wliktcd></div> <a${addAttribute(`/admin/countries/${profile.id}/documents`, "href")} class="step-tab" data-astro-cid-6wliktcd> <span class="step-num" data-astro-cid-6wliktcd>2</span> Documents
</a> <div class="step-connector" data-astro-cid-6wliktcd></div> <span class="step-tab disabled" data-astro-cid-6wliktcd> <span class="step-num" data-astro-cid-6wliktcd>3</span> AI Analysis
</span> <div class="step-connector" data-astro-cid-6wliktcd></div> <span class="step-tab disabled" data-astro-cid-6wliktcd> <span class="step-num" data-astro-cid-6wliktcd>4</span> Activate
</span> </div> <div class="form-layout" data-astro-cid-6wliktcd> <div class="form-card" data-astro-cid-6wliktcd> <div class="card-header" data-astro-cid-6wliktcd> <div class="header-left" data-astro-cid-6wliktcd> <div class="country-badge" data-astro-cid-6wliktcd> <span class="code" data-astro-cid-6wliktcd>${profile.country.code}</span> <span class="cname" data-astro-cid-6wliktcd>${profile.country.name}</span> </div> <span class="provider-tag" data-astro-cid-6wliktcd>${profile.provider.name} · ${profile.provider.type}</span> </div> <span${addAttribute(`status-badge status-${profile.status}`, "class")} data-astro-cid-6wliktcd>${profile.status.replace("_", " ")}</span> </div> <!-- TODO: PATCH /admin/profiles/{id} via App 2 API --> <form id="setup-form" class="form" action="#" method="POST" data-astro-cid-6wliktcd> <div class="form-grid" data-astro-cid-6wliktcd> <div class="field" data-astro-cid-6wliktcd> <label for="country" data-astro-cid-6wliktcd>Country</label> <input type="text" id="country" name="country"${addAttribute(profile.country.name, "value")} readonly class="readonly" data-astro-cid-6wliktcd> </div> <div class="field" data-astro-cid-6wliktcd> <label for="provider_name" data-astro-cid-6wliktcd>Provider</label> <input type="text" id="provider_name" name="provider_name"${addAttribute(profile.provider.name, "value")} readonly class="readonly" data-astro-cid-6wliktcd> </div> <div class="field" data-astro-cid-6wliktcd> <label for="provider_type" data-astro-cid-6wliktcd>Provider Type</label> <input type="text" id="provider_type" name="provider_type"${addAttribute(profile.provider.type, "value")} readonly class="readonly" data-astro-cid-6wliktcd> </div> <div class="field" data-astro-cid-6wliktcd> <label for="currency" data-astro-cid-6wliktcd>Currency <span class="required" data-astro-cid-6wliktcd>*</span></label> <select id="currency" name="currency" required data-astro-cid-6wliktcd> ${["EUR", "GBP", "PLN", "RON"].map((c) => renderTemplate`<option${addAttribute(c, "value")}${addAttribute(c === profile.currency, "selected")} data-astro-cid-6wliktcd>${c}</option>`)} </select> </div> <div class="field" data-astro-cid-6wliktcd> <label for="version" data-astro-cid-6wliktcd>Version</label> <input type="text" id="version" name="version"${addAttribute(profile.version, "value")} data-astro-cid-6wliktcd> </div> <div class="field" data-astro-cid-6wliktcd> <label for="calculation_basis" data-astro-cid-6wliktcd>Calculation Basis</label> <input type="text" id="calculation_basis" name="calculation_basis" value="PA transactions" data-astro-cid-6wliktcd> </div> <div class="field full-width" data-astro-cid-6wliktcd> <label for="notes" data-astro-cid-6wliktcd>Notes</label> <textarea id="notes" name="notes" rows="3" placeholder="Any relevant context about this profile…" data-astro-cid-6wliktcd></textarea> </div> </div> <div class="form-actions" data-astro-cid-6wliktcd> <a href="/countries" class="btn-secondary" data-astro-cid-6wliktcd>Back to Countries</a> <button type="submit" name="action" value="save" class="btn-ghost" data-astro-cid-6wliktcd>
Save draft
</button> <a${addAttribute(`/admin/countries/${profile.id}/documents`, "href")} class="btn-primary" data-astro-cid-6wliktcd>
Next: Upload Documents
<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-6wliktcd> <path d="M5 12h14M12 5l7 7-7 7" data-astro-cid-6wliktcd></path> </svg> </a> </div> </form> </div> <!-- Info panel --> <aside class="side-info" data-astro-cid-6wliktcd> <div class="info-card" data-astro-cid-6wliktcd> <h3 data-astro-cid-6wliktcd>Profile status</h3> <div class="status-timeline" data-astro-cid-6wliktcd> ${[
    { key: "draft", label: "Draft", desc: "Profile created, no documents yet" },
    { key: "pending_approval", label: "Pending Approval", desc: "Analysis done, rules pending review" },
    { key: "active", label: "Active", desc: "Available to customers" },
    { key: "archived", label: "Archived", desc: "Superseded by newer version" }
  ].map((s, i) => renderTemplate`<div${addAttribute(`timeline-item ${s.key === profile.status ? "current" : ""}`, "class")} data-astro-cid-6wliktcd> <div class="timeline-dot" data-astro-cid-6wliktcd></div> <div data-astro-cid-6wliktcd> <p class="timeline-label" data-astro-cid-6wliktcd>${s.label}</p> <p class="timeline-desc" data-astro-cid-6wliktcd>${s.desc}</p> </div> </div>`)} </div> </div> </aside> </div> ` })}`;
}, "/Users/macnolo/Desktop/Code/b2brouter-calculator/src/pages/admin/countries/[id]/setup.astro", void 0);

const $$file = "/Users/macnolo/Desktop/Code/b2brouter-calculator/src/pages/admin/countries/[id]/setup.astro";
const $$url = "/admin/countries/[id]/setup";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Setup,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
