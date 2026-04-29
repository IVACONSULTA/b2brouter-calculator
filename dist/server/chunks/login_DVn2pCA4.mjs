import { c as createComponent } from './astro-component_CFbB7t5t.mjs';
import 'piccolore';
import { h as renderComponent, r as renderTemplate, m as maybeRenderHead } from './server_5UhKKJIi.mjs';
import { r as renderScript } from './script_DccjArJC.mjs';
import { $ as $$Layout } from './Layout_DkJa9tiu.mjs';
import { g as getSession } from './session_DDm0LoiA.mjs';

const $$Login = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$Login;
  const session = getSession(Astro2.cookies);
  if (session?.role === "client" || session?.role === "customer" || session?.role === "internal") {
    return Astro2.redirect("/dashboard");
  }
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "User Login — PA Plan Advisor", "data-astro-cid-vg3jlt4l": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<main class="login-page" data-astro-cid-vg3jlt4l> <div class="login-card" data-astro-cid-vg3jlt4l> <div class="login-header" data-astro-cid-vg3jlt4l> <div class="icon customer" data-astro-cid-vg3jlt4l> <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-vg3jlt4l> <circle cx="12" cy="8" r="4" data-astro-cid-vg3jlt4l></circle> <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" data-astro-cid-vg3jlt4l></path> </svg> </div> <div data-astro-cid-vg3jlt4l> <h1 data-astro-cid-vg3jlt4l>User Portal</h1> <p data-astro-cid-vg3jlt4l>Calculate PA plans and manage your scenarios</p> </div> </div> <div class="divider" data-astro-cid-vg3jlt4l></div> <div class="demo-notice" data-astro-cid-vg3jlt4l> <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-vg3jlt4l> <circle cx="12" cy="12" r="10" data-astro-cid-vg3jlt4l></circle><path d="M12 16v-4M12 8h.01" data-astro-cid-vg3jlt4l></path> </svg>
Demo mode — select a role to sign in instantly.
</div> <!-- Role selector --> <div class="role-selector" data-astro-cid-vg3jlt4l> <button class="role-btn active" id="btn-client" onclick="selectRole('client', this)" data-astro-cid-vg3jlt4l> <div class="role-dot dot-client" data-astro-cid-vg3jlt4l></div> <div class="role-info" data-astro-cid-vg3jlt4l> <span class="role-name" data-astro-cid-vg3jlt4l>Client</span> <span class="role-desc" data-astro-cid-vg3jlt4l>External customer · own scenarios</span> </div> </button> <button class="role-btn" id="btn-internal" onclick="selectRole('internal', this)" data-astro-cid-vg3jlt4l> <div class="role-dot dot-internal" data-astro-cid-vg3jlt4l></div> <div class="role-info" data-astro-cid-vg3jlt4l> <span class="role-name" data-astro-cid-vg3jlt4l>Internal</span> <span class="role-desc" data-astro-cid-vg3jlt4l>B2Brouter team · all scenarios + AI</span> </div> </button> </div> <form action="/api/auth/dummy-login" method="POST" class="login-form" id="login-form" data-astro-cid-vg3jlt4l> <input type="hidden" name="role" id="role-input" value="client" data-astro-cid-vg3jlt4l> <div class="field" data-astro-cid-vg3jlt4l> <label for="email" data-astro-cid-vg3jlt4l>Email address</label> <input type="email" id="email" name="email" value="client@acmecorp.com" placeholder="email@company.com" readonly data-astro-cid-vg3jlt4l> </div> <div class="field" data-astro-cid-vg3jlt4l> <label for="password" data-astro-cid-vg3jlt4l>Password</label> <input type="password" id="password" name="password" value="••••••••" placeholder="••••••••" readonly data-astro-cid-vg3jlt4l> </div> <button type="submit" class="btn-primary customer" id="btn-submit" data-astro-cid-vg3jlt4l> <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-vg3jlt4l> <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" data-astro-cid-vg3jlt4l></path> <polyline points="10 17 15 12 10 7" data-astro-cid-vg3jlt4l></polyline> <line x1="15" y1="12" x2="3" y2="12" data-astro-cid-vg3jlt4l></line> </svg>
Sign in as Client
</button> </form> <div class="back-link" data-astro-cid-vg3jlt4l> <a href="/" data-astro-cid-vg3jlt4l> <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-vg3jlt4l> <path d="M19 12H5M12 19l-7-7 7-7" data-astro-cid-vg3jlt4l></path> </svg>
Back to portal selection
</a> </div> </div> </main> ` })} ${renderScript($$result, "/Users/macnolo/Desktop/Code/b2brouter-calculator/src/pages/customer/login.astro?astro&type=script&index=0&lang.ts")}`;
}, "/Users/macnolo/Desktop/Code/b2brouter-calculator/src/pages/customer/login.astro", void 0);

const $$file = "/Users/macnolo/Desktop/Code/b2brouter-calculator/src/pages/customer/login.astro";
const $$url = "/customer/login";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Login,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
