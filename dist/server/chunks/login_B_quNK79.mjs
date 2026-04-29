import { c as createComponent } from './astro-component_CFbB7t5t.mjs';
import 'piccolore';
import { h as renderComponent, r as renderTemplate, m as maybeRenderHead } from './server_5UhKKJIi.mjs';
import { $ as $$Layout } from './Layout_DkJa9tiu.mjs';
import { g as getSession } from './session_DDm0LoiA.mjs';

const $$Login = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$Login;
  const session = getSession(Astro2.cookies);
  if (session?.role === "admin") {
    return Astro2.redirect("/admin/dashboard");
  }
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Admin Login", "data-astro-cid-rf56lckb": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<main class="login-page" data-astro-cid-rf56lckb> <div class="login-card" data-astro-cid-rf56lckb> <div class="login-header" data-astro-cid-rf56lckb> <div class="icon admin" data-astro-cid-rf56lckb> <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-rf56lckb> <path d="M12 2L2 7l10 5 10-5-10-5z" data-astro-cid-rf56lckb></path> <path d="M2 17l10 5 10-5" data-astro-cid-rf56lckb></path> <path d="M2 12l10 5 10-5" data-astro-cid-rf56lckb></path> </svg> </div> <div data-astro-cid-rf56lckb> <h1 data-astro-cid-rf56lckb>Admin Portal</h1> <p data-astro-cid-rf56lckb>Sign in to access the administration dashboard</p> </div> </div> <div class="divider" data-astro-cid-rf56lckb></div> <div class="demo-notice" data-astro-cid-rf56lckb> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-rf56lckb> <circle cx="12" cy="12" r="10" data-astro-cid-rf56lckb></circle> <path d="M12 16v-4M12 8h.01" data-astro-cid-rf56lckb></path> </svg>
Demo mode — authentication is bypassed. Click below to enter.
</div> <form action="/api/auth/dummy-login" method="POST" class="login-form" data-astro-cid-rf56lckb> <input type="hidden" name="role" value="admin" data-astro-cid-rf56lckb> <div class="field" data-astro-cid-rf56lckb> <label for="email" data-astro-cid-rf56lckb>Email address</label> <input type="email" id="email" name="email" value="admin@example.com" placeholder="admin@example.com" readonly data-astro-cid-rf56lckb> </div> <div class="field" data-astro-cid-rf56lckb> <label for="password" data-astro-cid-rf56lckb>Password</label> <input type="password" id="password" name="password" value="••••••••" placeholder="••••••••" readonly data-astro-cid-rf56lckb> </div> <button type="submit" class="btn-primary admin" data-astro-cid-rf56lckb> <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-rf56lckb> <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" data-astro-cid-rf56lckb></path> <polyline points="10 17 15 12 10 7" data-astro-cid-rf56lckb></polyline> <line x1="15" y1="12" x2="3" y2="12" data-astro-cid-rf56lckb></line> </svg>
Sign in as Admin
</button> </form> <div class="back-link" data-astro-cid-rf56lckb> <a href="/" data-astro-cid-rf56lckb> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-rf56lckb> <path d="M19 12H5M12 19l-7-7 7-7" data-astro-cid-rf56lckb></path> </svg>
Back to portal selection
</a> </div> </div> </main> ` })}`;
}, "/Users/macnolo/Desktop/Code/b2brouter-calculator/src/pages/admin/login.astro", void 0);

const $$file = "/Users/macnolo/Desktop/Code/b2brouter-calculator/src/pages/admin/login.astro";
const $$url = "/admin/login";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Login,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
