import { c as createComponent } from './astro-component_CFbB7t5t.mjs';
import 'piccolore';
import { l as renderHead, j as renderSlot, r as renderTemplate } from './server_5UhKKJIi.mjs';
import 'clsx';

const $$Layout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$Layout;
  const { title } = Astro2.props;
  return renderTemplate`<html lang="en"> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><title>${title} — B2B Router Calculator</title>${renderHead()}</head> <body> ${renderSlot($$result, $$slots["default"])} </body></html>`;
}, "/Users/macnolo/Desktop/Code/b2brouter-calculator/src/layouts/Layout.astro", void 0);

export { $$Layout as $ };
