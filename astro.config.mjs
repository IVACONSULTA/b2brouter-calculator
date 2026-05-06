import { defineConfig, sessionDrivers, envField } from "astro/config";
import netlify from "@astrojs/netlify";
import react from "@astrojs/react";

import tailwindcss from "@tailwindcss/vite";

/**
 * `npm run dev` sets NETLIFY_DEV=1 so @netlify/vite-plugin skips Netlify Dev.
 * Otherwise it starts the Edge Functions (Deno) dev server, which often fails
 * locally with "Could not establish a connection to the Netlify Edge Functions local development server".
 *
 * Production builds omit NETLIFY_DEV, so the adapter keeps the default Netlify Blobs session driver.
 */
const netlifyVitePluginSkipped = process.env.NETLIFY_DEV === "1";

export default defineConfig({
  output: "server",
  integrations: [react()],
  adapter: netlify(),

  env: {
    schema: {
      SUPABASE_URL: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      SUPABASE_ANON_KEY: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      /** Local Supabase CLI snippets often use this name; dev fallback only in `supabase.ts`. */
      SUPABASE_KEY: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
    },
  },

  ...(netlifyVitePluginSkipped && {
    session: {
      driver: sessionDrivers.fs(),
    },
  }),

  vite: {
    plugins: [tailwindcss()],
  },
});