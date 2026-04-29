import { c as createComponent } from './astro-component_CFbB7t5t.mjs';
import 'piccolore';
import { h as renderComponent, r as renderTemplate, m as maybeRenderHead, f as addAttribute } from './server_5UhKKJIi.mjs';
import { $ as $$Layout } from './Layout_DkJa9tiu.mjs';
import { g as getSession } from './session_DDm0LoiA.mjs';

const $$Dashboard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$Dashboard;
  const session = getSession(Astro2.cookies);
  if (!session || session.role !== "customer") {
    return Astro2.redirect("/customer/login");
  }
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Customer Dashboard", "data-astro-cid-4binj5pa": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="app" data-astro-cid-4binj5pa> <aside class="sidebar" data-astro-cid-4binj5pa> <div class="sidebar-header" data-astro-cid-4binj5pa> <div class="logo" data-astro-cid-4binj5pa> <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-4binj5pa> <circle cx="12" cy="8" r="4" data-astro-cid-4binj5pa></circle> <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" data-astro-cid-4binj5pa></path> </svg> <span data-astro-cid-4binj5pa>My Account</span> </div> </div> <nav class="sidebar-nav" data-astro-cid-4binj5pa> <a href="#" class="nav-item active" data-astro-cid-4binj5pa> <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-4binj5pa> <rect x="3" y="3" width="7" height="7" data-astro-cid-4binj5pa></rect> <rect x="14" y="3" width="7" height="7" data-astro-cid-4binj5pa></rect> <rect x="14" y="14" width="7" height="7" data-astro-cid-4binj5pa></rect> <rect x="3" y="14" width="7" height="7" data-astro-cid-4binj5pa></rect> </svg>
Dashboard
</a> <a href="#" class="nav-item" data-astro-cid-4binj5pa> <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-4binj5pa> <path d="M3 12h18M3 6h18M3 18h18" data-astro-cid-4binj5pa></path> </svg>
My Routes
</a> <a href="#" class="nav-item" data-astro-cid-4binj5pa> <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-4binj5pa> <rect x="2" y="5" width="20" height="14" rx="2" data-astro-cid-4binj5pa></rect> <line x1="2" y1="10" x2="22" y2="10" data-astro-cid-4binj5pa></line> </svg>
Billing
</a> <a href="#" class="nav-item" data-astro-cid-4binj5pa> <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-4binj5pa> <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" data-astro-cid-4binj5pa></polyline> </svg>
Calculator
</a> </nav> <div class="sidebar-footer" data-astro-cid-4binj5pa> <div class="user-info" data-astro-cid-4binj5pa> <div class="avatar customer" data-astro-cid-4binj5pa>${session.name.charAt(0)}</div> <div class="user-details" data-astro-cid-4binj5pa> <span class="user-name" data-astro-cid-4binj5pa>${session.name}</span> <span class="user-role" data-astro-cid-4binj5pa>Customer</span> </div> </div> <form action="/api/auth/logout" method="POST" data-astro-cid-4binj5pa> <button type="submit" class="logout-btn" title="Sign out" data-astro-cid-4binj5pa> <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-4binj5pa> <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" data-astro-cid-4binj5pa></path> <polyline points="16 17 21 12 16 7" data-astro-cid-4binj5pa></polyline> <line x1="21" y1="12" x2="9" y2="12" data-astro-cid-4binj5pa></line> </svg> </button> </form> </div> </aside> <div class="main-content" data-astro-cid-4binj5pa> <header class="topbar" data-astro-cid-4binj5pa> <div data-astro-cid-4binj5pa> <h1 data-astro-cid-4binj5pa>Dashboard</h1> <p class="breadcrumb" data-astro-cid-4binj5pa>Welcome back, ${session.name}</p> </div> </header> <div class="content" data-astro-cid-4binj5pa> <div class="stats-grid" data-astro-cid-4binj5pa> <div class="stat-card" data-astro-cid-4binj5pa> <div class="stat-icon customer" data-astro-cid-4binj5pa> <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-4binj5pa> <path d="M3 12h18M3 6h18M3 18h18" data-astro-cid-4binj5pa></path> </svg> </div> <div class="stat-info" data-astro-cid-4binj5pa> <span class="stat-value" data-astro-cid-4binj5pa>8</span> <span class="stat-label" data-astro-cid-4binj5pa>Active Routes</span> </div> </div> <div class="stat-card" data-astro-cid-4binj5pa> <div class="stat-icon customer" data-astro-cid-4binj5pa> <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-4binj5pa> <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" data-astro-cid-4binj5pa></polyline> </svg> </div> <div class="stat-info" data-astro-cid-4binj5pa> <span class="stat-value" data-astro-cid-4binj5pa>4,218</span> <span class="stat-label" data-astro-cid-4binj5pa>Calls This Month</span> </div> </div> <div class="stat-card" data-astro-cid-4binj5pa> <div class="stat-icon customer" data-astro-cid-4binj5pa> <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-4binj5pa> <line x1="12" y1="1" x2="12" y2="23" data-astro-cid-4binj5pa></line> <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" data-astro-cid-4binj5pa></path> </svg> </div> <div class="stat-info" data-astro-cid-4binj5pa> <span class="stat-value" data-astro-cid-4binj5pa>$482.60</span> <span class="stat-label" data-astro-cid-4binj5pa>Current Balance</span> </div> </div> <div class="stat-card" data-astro-cid-4binj5pa> <div class="stat-icon customer" data-astro-cid-4binj5pa> <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-4binj5pa> <circle cx="12" cy="12" r="10" data-astro-cid-4binj5pa></circle> <path d="M12 8v4l3 3" data-astro-cid-4binj5pa></path> </svg> </div> <div class="stat-info" data-astro-cid-4binj5pa> <span class="stat-value" data-astro-cid-4binj5pa>May 1</span> <span class="stat-label" data-astro-cid-4binj5pa>Next Invoice</span> </div> </div> </div> <div class="section-grid" data-astro-cid-4binj5pa> <div class="panel" data-astro-cid-4binj5pa> <div class="panel-header" data-astro-cid-4binj5pa> <h3 data-astro-cid-4binj5pa>My Routes</h3> </div> <ul class="route-list" data-astro-cid-4binj5pa> ${[
    { route: "DE → FR", status: "active", calls: "1,240" },
    { route: "US → EU", status: "active", calls: "980" },
    { route: "UK → US", status: "active", calls: "710" },
    { route: "ES → LATAM", status: "inactive", calls: "0" }
  ].map((r) => renderTemplate`<li class="route-item" data-astro-cid-4binj5pa> <span class="route-name" data-astro-cid-4binj5pa>${r.route}</span> <span${addAttribute(`route-status ${r.status}`, "class")} data-astro-cid-4binj5pa>${r.status}</span> <span class="route-calls" data-astro-cid-4binj5pa>${r.calls} calls</span> </li>`)} </ul> </div> <div class="panel" data-astro-cid-4binj5pa> <div class="panel-header" data-astro-cid-4binj5pa> <h3 data-astro-cid-4binj5pa>Recent Invoices</h3> </div> <ul class="invoice-list" data-astro-cid-4binj5pa> ${[
    { period: "April 2026", amount: "$482.60", status: "pending" },
    { period: "March 2026", amount: "$391.20", status: "paid" },
    { period: "February 2026", amount: "$445.80", status: "paid" },
    { period: "January 2026", amount: "$312.40", status: "paid" }
  ].map((inv) => renderTemplate`<li class="invoice-item" data-astro-cid-4binj5pa> <span class="invoice-period" data-astro-cid-4binj5pa>${inv.period}</span> <span class="invoice-amount" data-astro-cid-4binj5pa>${inv.amount}</span> <span${addAttribute(`invoice-status ${inv.status}`, "class")} data-astro-cid-4binj5pa>${inv.status}</span> </li>`)} </ul> </div> </div> </div> </div> </div> ` })}`;
}, "/Users/macnolo/Desktop/Code/b2brouter-calculator/src/pages/customer/dashboard.astro", void 0);

const $$file = "/Users/macnolo/Desktop/Code/b2brouter-calculator/src/pages/customer/dashboard.astro";
const $$url = "/customer/dashboard";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Dashboard,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
