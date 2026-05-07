/**
 * Document upload diagnostics. Enable on Netlify / local:
 * - `PUBLIC_PA_UPLOAD_DEBUG=1` — browser console + Astro SSR / API routes
 * In dev, logging is always on.
 */

export const PA_UPLOAD_LOG_PREFIX = '[PA upload]';

export function isPaUploadDebug(): boolean {
  if (import.meta.env.DEV) return true;
  const v = import.meta.env.PUBLIC_PA_UPLOAD_DEBUG;
  return v === '1' || v === 'true';
}

export function paUploadLog(...args: unknown[]): void {
  if (!isPaUploadDebug()) return;
  console.log(PA_UPLOAD_LOG_PREFIX, ...args);
}
