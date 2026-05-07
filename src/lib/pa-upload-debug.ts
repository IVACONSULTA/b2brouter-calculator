/**
 * Document upload diagnostics.
 *
 * **SSR / BFF / API routes** (`paUploadLog`): enabled when `import.meta.env.DEV` or
 * `PUBLIC_PA_UPLOAD_DEBUG=1` was present **at build time** (Netlify: set the var and
 * trigger a new deploy so Vite inlines it).
 *
 * **Browser / React islands** (`paUploadLogClient`): same as above, plus open the page with
 * `?pa_upload_debug=1` (or `true`) — no rebuild needed on Netlify.
 */

export const PA_UPLOAD_LOG_PREFIX = '[PA upload]';

export function isPaUploadDebug(): boolean {
  if (import.meta.env.DEV) return true;
  const v = import.meta.env.PUBLIC_PA_UPLOAD_DEBUG;
  return v === '1' || v === 'true';
}

/** True in browser when build-time flag is on or URL has `?pa_upload_debug=1`. */
export function isPaUploadDebugClient(): boolean {
  if (isPaUploadDebug()) return true;
  if (typeof window === 'undefined') return false;
  try {
    const q = new URLSearchParams(window.location.search);
    const raw = q.get('pa_upload_debug');
    return raw === '1' || raw === 'true';
  } catch {
    return false;
  }
}

export function paUploadLog(...args: unknown[]): void {
  if (!isPaUploadDebug()) return;
  console.log(PA_UPLOAD_LOG_PREFIX, ...args);
}

/** Use from React components so production Netlify can enable logs via `?pa_upload_debug=1`. */
export function paUploadLogClient(...args: unknown[]): void {
  if (!isPaUploadDebugClient()) return;
  console.log(PA_UPLOAD_LOG_PREFIX, ...args);
}
