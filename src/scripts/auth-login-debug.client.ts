/**
 * Prints auth login debug lines in the browser console (Netlify / production debugging).
 * Enable with `?debug_auth=1` on the login URL or `PUBLIC_AUTH_DEBUG=1` on the host.
 */

const COOKIE_NAME = 'pa_auth_debug';

function readDebugCookie(): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function clearDebugCookie(): void {
  document.cookie = `${COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function flushAuthLoginDebugToConsole(): void {
  const raw = readDebugCookie();
  if (!raw) return;
  clearDebugCookie();

  try {
    const payload = JSON.parse(raw) as {
      ts?: string;
      outcome?: string;
      lines?: Array<{ level?: string; msg?: string; data?: unknown }>;
    };

    console.group(
      `%c[auth/login] debug`,
      'color:#7c3aed;font-weight:bold',
      payload.outcome ?? 'unknown',
      payload.ts ?? '',
    );
    for (const line of payload.lines ?? []) {
      const text = `[auth/login] ${line.msg ?? ''}`;
      const data = line.data;
      if (line.level === 'error') console.error(text, data ?? '');
      else if (line.level === 'warn') console.warn(text, data ?? '');
      else console.log(text, data ?? '');
    }
    console.groupEnd();
  } catch (e) {
    console.warn('[auth/login] could not parse debug cookie', e, raw);
  }
}

function isDebugModeOnPage(): boolean {
  const params = new URLSearchParams(window.location.search);
  if (params.get('debug_auth') === '1') return true;
  const el = document.documentElement;
  return el.dataset.authDebug === '1';
}

function ensureDebugFormField(form: HTMLFormElement): void {
  if (!form.action.includes('/api/auth/login')) return;
  if (form.querySelector('input[name="debug_auth"]')) return;
  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = 'debug_auth';
  input.value = '1';
  form.appendChild(input);
}

export function initAuthLoginDebugClient(): void {
  flushAuthLoginDebugToConsole();

  if (!isDebugModeOnPage()) return;

  document.querySelectorAll<HTMLFormElement>('form[action*="/api/auth/login"]').forEach((form) => {
    ensureDebugFormField(form);
    form.addEventListener('submit', () => {
      console.log('[auth/login] submitting (debug_auth=1) →', form.action);
    });
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initAuthLoginDebugClient());
  } else {
    initAuthLoginDebugClient();
  }
}
