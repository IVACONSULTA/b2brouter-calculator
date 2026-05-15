import { defineConfig, sessionDrivers } from "astro/config";
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

/** React 19's production `jsx-dev-runtime` sets `jsxDEV` to `undefined`; if Vite prebundles deps with `NODE_ENV=production` while JSX is still emitted as `jsxDEV`, hydration throws. Keep dependency optimize + app transforms aligned. */
const viteNodeEnv =
  process.env.NODE_ENV === "production" ? "production" : "development";

export default defineConfig({
  output: "server",
  integrations: [react()],
  adapter: netlify(),

  ...(netlifyVitePluginSkipped && {
    session: {
      driver: sessionDrivers.fs(),
    },
  }),

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: ["react", "react-dom"],
    },
    esbuild: {
      jsx: "automatic",
      jsxDev: viteNodeEnv !== "production",
    },
    optimizeDeps: {
      esbuildOptions: {
        jsx: "automatic",
        define: {
          "process.env.NODE_ENV": JSON.stringify(viteNodeEnv),
        },
      },
    },
  },
});