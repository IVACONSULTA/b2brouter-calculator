/**
 * Client behavior for `src/pages/scenarios/[id].astro`.
 * Sets globals used by inline `onclick` attributes.
 */
import { paFetchJsonGenerateSummaryPost } from '../lib/pa-generate-summary-client';

declare global {
  interface Window {
    copySummary: () => void;
    paOnClickGenerateAiSummary: (btnEl: EventTarget | null) => Promise<void>;
    paScenarioDeleteConfirm?: (opts?: { clientName?: string }) => Promise<boolean>;
    paScenarioDialogAlert?: (message: string) => Promise<void>;
  }
}

function copySummary() {
  const text = document.getElementById('summary-text')?.innerText;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('btn-copy');
    if (btn) {
      btn.textContent = '✓ Copied!';
      setTimeout(() => {
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy Summary`;
      }, 2000);
    }
  });
}

window.copySummary = copySummary;

/**
 * Inline `onclick` for Generate AI Summary / Regenerate buttons.
 * Calls `paFetchJsonGenerateSummaryPost` (browser) → Astro BFF → server `paFetchJson`.
 */
window.paOnClickGenerateAiSummary = async function paOnClickGenerateAiSummary(
  btnEl: EventTarget | null,
) {
  const btn = btnEl instanceof HTMLButtonElement ? btnEl : null;
  if (!btn) return;
  const url = (btn.dataset.paSummaryUrl ?? '').trim();
  if (!url) {
    alert('Configure Supabase + API_BASE_URL to generate summaries.');
    return;
  }
  btn.disabled = true;
  const prev = btn.textContent;
  btn.textContent = '…';
  try {
    const response = await paFetchJsonGenerateSummaryPost(url);
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const msg =
        typeof data.message === 'string'
          ? data.message
          : typeof data.error === 'string'
            ? data.error
            : JSON.stringify(data);
      alert(`Summary failed (${response.status}): ${msg}`);
      btn.disabled = false;
      btn.textContent = prev ?? 'Generate';
      return;
    }
    window.location.reload();
  } catch (err) {
    console.error(err);
    alert(
      'Summary request failed. Check your connection and Plan Advisor SUMMARY_AGENT_URL configuration.',
    );
    btn.disabled = false;
    btn.textContent = prev ?? 'Generate';
  }
};

async function downloadScenarioJsonDetail(id: string) {
  const res = await fetch(`/api/pa/scenarios/${encodeURIComponent(id)}/export?format=json`, {
    credentials: 'same-origin',
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const msg =
      typeof data.message === 'string'
        ? data.message
        : typeof data.error === 'string'
          ? data.error
          : `HTTP ${res.status}`;
    alert(`Download failed: ${msg}`);
    return;
  }
  const blob = await res.blob();
  const cd = res.headers.get('Content-Disposition');
  let safeName = `scenario-${id.slice(0, 8)}.json`;
  const quoted = cd && /filename="([^"]+)"/.exec(cd);
  if (quoted) safeName = quoted[1] ?? safeName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function attachScenarioExportDelete() {
  document.querySelectorAll('.js-scenario-export').forEach((el) => {
    if (!(el instanceof HTMLButtonElement)) return;
    const btn = el;
    btn.addEventListener('click', () => {
      const sid = btn.getAttribute('data-scenario-id');
      if (!sid) return;
      void downloadScenarioJsonDetail(sid);
    });
  });
  document.querySelectorAll('.js-scenario-delete').forEach((el) => {
    if (!(el instanceof HTMLButtonElement)) return;
    const btn = el;
    btn.addEventListener('click', async () => {
      const sid = btn.getAttribute('data-scenario-id');
      if (!sid) return;
      const clientName = btn.getAttribute('data-client-name') ?? undefined;
      const del = window.paScenarioDeleteConfirm;
      const alertDlg = window.paScenarioDialogAlert;
      const ok =
        typeof del === 'function'
          ? await del({ clientName })
          : window.confirm('Delete this scenario permanently? This cannot be undone.');
      if (!ok) return;
      btn.disabled = true;
      try {
        const res = await fetch(`/api/pa/scenarios/${encodeURIComponent(sid)}`, {
          method: 'DELETE',
          credentials: 'same-origin',
        });
        if (res.status === 204) {
          window.location.href = '/scenarios';
          return;
        }
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        const msg =
          typeof data.message === 'string'
            ? data.message
            : typeof data.error === 'string'
              ? data.error
              : JSON.stringify(data);
        const detail = `Delete failed (${res.status}): ${msg}`;
        if (typeof alertDlg === 'function') {
          await alertDlg(detail);
        } else {
          alert(detail);
        }
        btn.disabled = false;
      } catch {
        if (typeof alertDlg === 'function') {
          await alertDlg(
            'Delete request failed. Check your connection and try again.',
          );
        } else {
          alert('Delete request failed. Check your connection and try again.');
        }
        btn.disabled = false;
      }
    });
  });
}

function initScenarioDetailClient() {
  attachScenarioExportDelete();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScenarioDetailClient);
} else {
  initScenarioDetailClient();
}
