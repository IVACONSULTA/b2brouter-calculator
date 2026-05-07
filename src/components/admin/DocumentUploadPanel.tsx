import { useCallback, useEffect, useRef, useState } from 'react';
import { paUploadLogClient } from '../../lib/pa-upload-debug';

export type DocumentTypeOption = { value: string; label: string };

export type DocumentUploadPanelProps = {
  /** BFF route — forwards to Railway PlanAdvisorAPI with Supabase JWT. */
  uploadEndpoint: string;
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

const ACCEPT =
  '.pdf,.docx,.xlsx,.csv,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const MAX_BYTES = 50 * 1024 * 1024;

export default function DocumentUploadPanel({
  uploadEndpoint,
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
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    paUploadLogClient('DocumentUploadPanel props', {
      canUpload,
      localMode,
      uploadMode,
      profileSlug,
      countryId: countryId || '(empty)',
      providerId: providerId || '(empty)',
      profileId: profileId || '(empty)',
      uploadEndpoint,
    });
  }, [canUpload, localMode, uploadMode, profileSlug, countryId, providerId, profileId, uploadEndpoint]);

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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!canUpload) {
      setMessage({
        kind: 'err',
        text:
          'Upload is not available. Sign in as admin, set API_BASE_URL for Plan Advisor, or enable PA_LOCAL_DOCUMENT_STORAGE for local-only storage.',
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
    if (!localMode && uploadMode === 'live' && (!countryId || !providerId || !profileId)) {
      setMessage({
        kind: 'err',
        text: 'Missing country, provider, or profile id — reload the page or complete profile setup.',
      });
      return;
    }

    const fd = new FormData();
    fd.append('file', file, file.name);
    fd.append('document_type', documentType);
    fd.append('profile_slug', profileSlug);
    if (description.trim()) fd.append('description', description.trim());
    if (uploadMode === 'staging') {
      fd.append('upload_mode', 'staging');
    } else if (!localMode) {
      fd.append('country_id', countryId);
      fd.append('provider_id', providerId);
      fd.append('profile_id', profileId);
    }

    paUploadLogClient('upload submit', {
      localMode,
      profileSlug,
      filename: file.name,
      size: file.size,
      documentType,
      countryId: countryId || undefined,
      providerId: providerId || undefined,
      profileId: profileId || undefined,
    });

    setBusy(true);
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
        setMessage({ kind: 'err', text: msg || `Upload failed (${res.status})` });
        setBusy(false);
        return;
      }
      window.location.reload();
    } catch (err) {
      paUploadLogClient('upload fetch error', err);
      setMessage({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Upload failed.',
      });
      setBusy(false);
    }
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

      {message && (
        <p
          className="upload-panel-msg"
          style={{
            margin: 0,
            fontSize: '0.78rem',
            color: message.kind === 'err' ? '#ef4444' : 'var(--color-success)',
          }}
        >
          {message.text}
        </p>
      )}

      <button type="submit" className="btn-upload" disabled={!canUpload || busy}>
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
        {!canUpload ? 'Upload unavailable' : busy ? 'Uploading…' : 'Upload Document'}
      </button>
    </form>
  );
}
