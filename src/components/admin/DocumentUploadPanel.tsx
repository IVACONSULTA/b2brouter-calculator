import { useCallback, useEffect, useRef, useState } from 'react';
import { loadCountryWizardDraft } from '../../lib/country-wizard-draft';
import { paUploadLogClient } from '../../lib/pa-upload-debug';

export type DocumentTypeOption = { value: string; label: string };

export type DocumentUploadPanelProps = {
  /** BFF route — forwards to Railway PlanAdvisorAPI with Supabase JWT. */
  uploadEndpoint: string;
  /**
   * BFF route for the pre-upload copyright compliance check.
   * When set, the file is scanned before storage.
   * If the check returns 451 (blocked), the upload is rejected.
   * Defaults to `/api/pa/admin/documents/copyright-check`.
   */
  copyrightCheckEndpoint?: string;
  canUpload: boolean;
  localMode: boolean;
  /** `staging` = wizard temp upload (no calculation_profiles UUID yet). */
  uploadMode: 'local' | 'live' | 'staging';
  profileSlug: string;
  countryId: string;
  providerId: string;
  profileId: string;
  documentTypes: DocumentTypeOption[];
};

type CopyrightStatus = 'clear' | 'restricted' | 'blocked';

type CopyrightCheckResult = {
  copyright_status: CopyrightStatus;
  reason: string;
  legal_basis?: string;
  paraphrase_required?: boolean;
  matched_pattern?: string | null;
  // blocked-only fields
  error?: string;
  action_required?: string;
};

/** Document that failed copyright check - stored client-side only */
type CopyrightFailedDocument = {
  id: string;
  filename: string;
  document_type: string;
  description?: string;
  copyright_status: Exclude<CopyrightStatus, 'clear'>;
  copyright_reason: string;
  legal_basis?: string;
  action_required?: string;
  failed_at: string;
};

/** Phase tracks what is currently happening in the panel. */
type Phase =
  | 'idle'
  | 'checking-copyright'
  | 'copyright-blocked'
  | 'uploading'
  | 'done'
  | 'error';

const ACCEPT =
  '.pdf,.docx,.xlsx,.csv,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const MAX_BYTES = 50 * 1024 * 1024;

const DEFAULT_COPYRIGHT_CHECK_ENDPOINT = '/api/pa/admin/documents/copyright-check';

const COPYRIGHT_FAILED_KEY = 'pa_copyright_failed_docs';

function getCopyrightFailedDocs(): CopyrightFailedDocument[] {
  try {
    const raw = localStorage.getItem(COPYRIGHT_FAILED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CopyrightFailedDocument[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCopyrightFailedDoc(doc: CopyrightFailedDocument): void {
  try {
    const existing = getCopyrightFailedDocs();
    // Prevent duplicates by filename + document_type
    const filtered = existing.filter(
      (d) => !(d.filename === doc.filename && d.document_type === doc.document_type)
    );
    filtered.unshift(doc);
    // Keep only last 50 failed docs
    const trimmed = filtered.slice(0, 50);
    localStorage.setItem(COPYRIGHT_FAILED_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore storage errors */
  }
}

function removeCopyrightFailedDoc(id: string): void {
  try {
    const existing = getCopyrightFailedDocs();
    const filtered = existing.filter((d) => d.id !== id);
    localStorage.setItem(COPYRIGHT_FAILED_KEY, JSON.stringify(filtered));
  } catch {
    /* ignore storage errors */
  }
}

function clearAllCopyrightFailedDocs(): void {
  try {
    localStorage.removeItem(COPYRIGHT_FAILED_KEY);
  } catch {
    /* ignore storage errors */
  }
}

// Export for use by parent components/pages
export { getCopyrightFailedDocs, removeCopyrightFailedDoc, clearAllCopyrightFailedDocs };
export type { CopyrightFailedDocument };

export default function DocumentUploadPanel({
  uploadEndpoint,
  copyrightCheckEndpoint = DEFAULT_COPYRIGHT_CHECK_ENDPOINT,
  canUpload,
  localMode,
  uploadMode,
  profileSlug,
  countryId,
  providerId,
  profileId,
  documentTypes,
}: DocumentUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('');
  const [description, setDescription] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [copyrightResult, setCopyrightResult] = useState<CopyrightCheckResult | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err' | 'warn'; text: string } | null>(null);

  // For wizard draft profiles, the SSR cannot read sessionStorage, so the profileId / countryId /
  // providerId props may be empty or wrong (SSR resolves by country+provider, which may match the
  // wrong existing active profile).  On mount, read the wizard draft stored at step 1 and prefer
  // those UUIDs over whatever SSR supplied.
  const [effectiveProfileId, setEffectiveProfileId] = useState(profileId);
  const [effectiveCountryId, setEffectiveCountryId] = useState(countryId);
  const [effectiveProviderId, setEffectiveProviderId] = useState(providerId);

  useEffect(() => {
    const draft = loadCountryWizardDraft(profileSlug);
    if (draft?.apiProfileId) setEffectiveProfileId(draft.apiProfileId);
    if (draft?.apiCountryId) setEffectiveCountryId(draft.apiCountryId);
    if (draft?.apiProviderId) setEffectiveProviderId(draft.apiProviderId);
  }, [profileSlug]);

  const busy = phase === 'checking-copyright' || phase === 'uploading';

  useEffect(() => {
    paUploadLogClient('DocumentUploadPanel props', {
      canUpload,
      localMode,
      uploadMode,
      profileSlug,
      countryId: effectiveCountryId || '(empty)',
      providerId: effectiveProviderId || '(empty)',
      profileId: effectiveProfileId || '(empty)',
      uploadEndpoint,
    });
  }, [canUpload, localMode, uploadMode, profileSlug, effectiveCountryId, effectiveProviderId, effectiveProfileId, uploadEndpoint]);

  const pickFile = useCallback((list: FileList | null) => {
    const f = list?.[0];
    if (!f) return;
    if (f.size > MAX_BYTES) {
      setMessage({ kind: 'err', text: 'File is too large (max 50 MB).' });
      setFile(null);
      return;
    }
    setFile(f);
    setMessage(null);
  }, []);

  /** Phase 2 — run the actual upload (called after copyright check passes). */
  const runUpload = async (f: File) => {
    setPhase('uploading');
    setMessage({ kind: 'ok', text: 'Uploading document…' });

    const fd = new FormData();
    fd.append('file', f, f.name);
    fd.append('document_type', documentType);
    fd.append('profile_slug', profileSlug);
    if (description.trim()) fd.append('description', description.trim());
    if (effectiveCountryId) fd.append('country_id', effectiveCountryId);
    if (effectiveProviderId) fd.append('provider_id', effectiveProviderId);
    if (effectiveProfileId) fd.append('profile_id', effectiveProfileId);
    if (uploadMode === 'staging') fd.append('upload_mode', 'staging');

    paUploadLogClient('upload submit', {
      localMode,
      profileSlug,
      filename: f.name,
      size: f.size,
      documentType,
      countryId: effectiveCountryId || undefined,
      providerId: effectiveProviderId || undefined,
      profileId: effectiveProfileId || undefined,
    });

    try {
      const res = await fetch(uploadEndpoint, {
        method: 'POST',
        body: fd,
        credentials: 'same-origin',
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      paUploadLogClient('upload response', { httpStatus: res.status, body: data });
      if (!res.ok) {
        const msg =
          typeof data.error === 'string'
            ? data.error
            : typeof data.message === 'string'
              ? data.message
              : res.statusText;
        setPhase('error');
        setMessage({ kind: 'err', text: msg || `Upload failed (${res.status})` });
        return;
      }
      setPhase('done');
      window.location.reload();
    } catch (err) {
      paUploadLogClient('upload fetch error', err);
      setPhase('error');
      setMessage({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Upload failed.',
      });
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setCopyrightResult(null);

    if (!canUpload) {
      setMessage({
        kind: 'err',
        text: 'Upload is not available. Sign in as admin, set API_BASE_URL for Plan Advisor, or enable PA_LOCAL_DOCUMENT_STORAGE for local-only storage.',
      });
      return;
    }
    if (!file) {
      setMessage({ kind: 'err', text: 'Choose a file to upload.' });
      return;
    }
    if (!documentType) {
      setMessage({ kind: 'err', text: 'Select a document type.' });
      return;
    }
    if (!localMode && uploadMode === 'live' && (!effectiveCountryId || !effectiveProviderId || !effectiveProfileId)) {
      setMessage({
        kind: 'err',
        text: 'Missing country, provider, or profile id — reload the page or complete profile setup.',
      });
      return;
    }

    // ── Phase 1: Copyright compliance check ─────────────────────────────────
    // Skip check for local-mode (no API backend available) or when endpoint absent.
    if (!localMode && copyrightCheckEndpoint) {
      setPhase('checking-copyright');
      setMessage({ kind: 'ok', text: 'Checking copyright compliance…' });

      const checkFd = new FormData();
      checkFd.append('file', file, file.name);

      let checkRes: Response;
      let checkData: CopyrightCheckResult;
      try {
        checkRes = await fetch(copyrightCheckEndpoint, {
          method: 'POST',
          body: checkFd,
          credentials: 'same-origin',
        });
        checkData = (await checkRes.json().catch(() => ({
          copyright_status: 'restricted' as CopyrightStatus,
          reason: 'Could not parse copyright check response.',
        }))) as CopyrightCheckResult;
        paUploadLogClient('copyright-check response', { httpStatus: checkRes.status, body: checkData });
      } catch (netErr) {
        // Network error reaching the check endpoint — log and proceed (fail open)
        paUploadLogClient('copyright-check network error', netErr);
        setPhase('idle');
        setMessage({
          kind: 'warn',
          text: 'Copyright check unavailable (network error). Proceeding with upload.',
        });
        await runUpload(file);
        return;
      }

      // BLOCKED — reject upload immediately
      if (checkRes.status === 451 || checkData.copyright_status === 'blocked') {
        setCopyrightResult(checkData);
        setPhase('copyright-blocked');
        setMessage(null);
        return;
      }

      // RESTRICTED — do NOT upload, store in client-side failed list
      if (checkData.copyright_status === 'restricted') {
        setCopyrightResult(checkData);
        const failedDoc: CopyrightFailedDocument = {
          id: crypto.randomUUID(),
          filename: file.name,
          document_type: documentType,
          description: description.trim() || undefined,
          copyright_status: 'restricted',
          copyright_reason: checkData.reason,
          legal_basis: checkData.legal_basis,
          failed_at: new Date().toISOString(),
        };
        saveCopyrightFailedDoc(failedDoc);
        setPhase('done');
        setMessage({
          kind: 'warn',
          text: 'Copyright restricted — document not uploaded. See "Copyright Issues" list below.',
        });
        // Clear form for next upload
        setFile(null);
        setDocumentType('');
        setDescription('');
        if (inputRef.current) inputRef.current.value = '';
        // Emit event to notify parent page
        window.dispatchEvent(new CustomEvent('copyright-failed-docs-changed'));
        return;
      }

      // CLEAR — proceed with upload
      setCopyrightResult(checkData);
      setMessage({ kind: 'ok', text: 'Copyright check passed. Uploading…' });
    }

    // ── Phase 2: Upload (only for 'clear' status) ───────────────────────────
    await runUpload(file);
  };

  return (
    <form className="upload-form" onSubmit={onSubmit} noValidate>
      <div
        className={`drop-zone${dragOver ? ' drag-over' : ''}`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          pickFile(e.dataTransfer.files);
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={28}
          height={28}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p className="drop-label">
          {file ? (
            <>
              Selected: <strong>{file.name}</strong>
            </>
          ) : (
            <>
              Drop file here or{' '}
              <span
                className="drop-link"
                role="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
              >
                browse
              </span>
            </>
          )}
        </p>
        <input
          ref={inputRef}
          id="doc-upload-file-input"
          type="file"
          className="hidden"
          accept={ACCEPT}
          onChange={(e) => pickFile(e.target.files)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <div className="field">
        <label htmlFor="doc-upload-type">
          Document Type <span className="required">*</span>
        </label>
        <select
          id="doc-upload-type"
          value={documentType}
          required
          onChange={(e) => setDocumentType(e.target.value)}
        >
          <option value="" disabled>
            Select type…
          </option>
          {documentTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="doc-upload-description">Description</label>
        <textarea
          id="doc-upload-description"
          rows={2}
          placeholder="Brief description of this document…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Copyright blocked — prominent block instead of regular message */}
      {phase === 'copyright-blocked' && copyrightResult && (
        <div
          style={{
            border: '1px solid #fca5a5',
            borderRadius: '0.5rem',
            background: '#fef2f2',
            padding: '0.875rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24"
              fill="none" stroke="#dc2626" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
              <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <strong style={{ color: '#dc2626', fontSize: '0.8rem' }}>Upload blocked — AI opt-out detected</strong>
          </div>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#7f1d1d', lineHeight: 1.5 }}>
            {copyrightResult.reason}
          </p>
          {copyrightResult.action_required && (
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#991b1b', fontStyle: 'italic' }}>
              {copyrightResult.action_required}
            </p>
          )}
          {copyrightResult.legal_basis && (
            <p style={{ margin: 0, fontSize: '0.68rem', color: '#b91c1c' }}>
              Legal basis: {copyrightResult.legal_basis}
            </p>
          )}
          <button
            type="button"
            style={{
              marginTop: '0.25rem',
              alignSelf: 'flex-start',
              fontSize: '0.72rem',
              padding: '0.25rem 0.6rem',
              border: '1px solid #fca5a5',
              borderRadius: '0.25rem',
              background: 'white',
              color: '#dc2626',
              cursor: 'pointer',
            }}
            onClick={() => {
              setPhase('idle');
              setCopyrightResult(null);
              setMessage(null);
              setFile(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
          >
            Clear and choose another file
          </button>
        </div>
      )}

      {/* Copyright restricted — inline notice */}
      {phase !== 'copyright-blocked' && copyrightResult?.copyright_status === 'restricted' && (
        <div
          style={{
            border: '1px solid #fcd34d',
            borderRadius: '0.5rem',
            background: '#fffbeb',
            padding: '0.6rem 0.875rem',
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'flex-start',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24"
            fill="none" stroke="#d97706" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
            aria-hidden style={{ flexShrink: 0, marginTop: 2 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#92400e', lineHeight: 1.5 }}>
            <strong>Restricted document:</strong> {copyrightResult.reason}
          </p>
        </div>
      )}

      {/* Copyright clear — inline notice */}
      {phase !== 'copyright-blocked' && copyrightResult?.copyright_status === 'clear' && (
        <div
          style={{
            border: '1px solid #86efac',
            borderRadius: '0.5rem',
            background: '#f0fdf4',
            padding: '0.5rem 0.875rem',
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24"
            fill="none" stroke="#16a34a" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#166534' }}>
            Copyright check passed — {copyrightResult.matched_pattern ?? 'no restrictions detected'}.
          </p>
        </div>
      )}

      {/* General status messages */}
      {message && phase !== 'copyright-blocked' && (
        <p
          className="upload-panel-msg"
          style={{
            margin: 0,
            fontSize: '0.78rem',
            color:
              message.kind === 'err'
                ? '#ef4444'
                : message.kind === 'warn'
                  ? '#d97706'
                  : 'var(--color-success)',
          }}
        >
          {message.text}
        </p>
      )}

      <button
        type="submit"
        className="btn-upload"
        disabled={!canUpload || busy || phase === 'copyright-blocked'}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        </svg>
        {!canUpload
          ? 'Upload unavailable'
          : phase === 'checking-copyright'
            ? 'Checking copyright…'
            : phase === 'uploading'
              ? 'Uploading…'
              : phase === 'copyright-blocked'
                ? 'Blocked'
                : 'Upload Document'}
      </button>
    </form>
  );
}
