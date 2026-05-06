import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

/** Repo path segments for PA_LOCAL_DOCUMENT_STORAGE / dev folder listing (local only). */
const LOCAL_DOCUMENTS_SEGMENTS = ['docs', 'uploads'] as const;

export type LocalManifestItem = {
  id: string;
  filename: string;
  document_type: string;
  description: string | null;
  copyright_status: string;
  created_at: string;
  size_label: string;
};

export type LocalManifest = { items: LocalManifestItem[] };

export function safeProfileSlug(profileSlug: string): string {
  return profileSlug.replace(/[^a-zA-Z0-9-_]/g, '') || 'profile';
}

function localProfileDir(profileSlug: string): string {
  return join(process.cwd(), ...LOCAL_DOCUMENTS_SEGMENTS, safeProfileSlug(profileSlug));
}

function manifestPath(profileSlug: string): string {
  return join(localProfileDir(profileSlug), '.manifest.json');
}

export function readLocalDocumentsManifest(profileSlug: string): LocalManifestItem[] {
  try {
    const p = manifestPath(profileSlug);
    if (!existsSync(p)) return [];
    const raw = readFileSync(p, 'utf8');
    const j = JSON.parse(raw) as LocalManifest;
    return Array.isArray(j.items) ? j.items : [];
  } catch {
    return [];
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function stableLocalFileId(profileSlug: string, filename: string): string {
  const h = createHash('sha256')
    .update(`${safeProfileSlug(profileSlug)}\0${filename}`)
    .digest('hex');
  return `local-${h.slice(0, 24)}`;
}

function inferDocumentType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf')) return 'tariff';
  if (lower.endsWith('.md') || lower.endsWith('.txt')) return 'methodology';
  return 'other';
}

/** True if `docs/uploads/{profile}/` exists and contains at least one regular file (excluding `.manifest.json`). */
export function hasLocalDocumentFiles(profileSlug: string): boolean {
  const dir = localProfileDir(profileSlug);
  if (!existsSync(dir)) return false;
  try {
    for (const name of readdirSync(dir)) {
      if (name === '.manifest.json' || name.startsWith('.')) continue;
      const fp = join(dir, name);
      try {
        const st = statSync(fp);
        if (st.isFile()) return true;
      } catch {
        continue;
      }
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Rows for the admin UI: manifest entries merged with files on disk (copied-in PDFs without manifest count).
 */
export function readLocalDocumentsCombined(profileSlug: string): LocalManifestItem[] {
  const dir = localProfileDir(profileSlug);
  const manifestByName = new Map<string, LocalManifestItem>();
  for (const item of readLocalDocumentsManifest(profileSlug)) {
    manifestByName.set(item.filename, item);
  }

  if (!existsSync(dir)) {
    return [...manifestByName.values()].sort((a, b) => a.filename.localeCompare(b.filename));
  }

  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return [...manifestByName.values()].sort((a, b) => a.filename.localeCompare(b.filename));
  }

  const out: LocalManifestItem[] = [];

  for (const name of names) {
    if (name === '.manifest.json' || name.startsWith('.')) continue;
    const fp = join(dir, name);
    let st;
    try {
      st = statSync(fp);
    } catch {
      continue;
    }
    if (!st.isFile()) continue;

    const existing = manifestByName.get(name);
    if (existing) {
      out.push(existing);
      continue;
    }

    out.push({
      id: stableLocalFileId(profileSlug, name),
      filename: name,
      document_type: inferDocumentType(name),
      description: null,
      copyright_status: 'pending',
      created_at: new Date(st.mtimeMs).toISOString(),
      size_label: formatSize(st.size),
    });
  }

  return out.sort((a, b) => a.filename.localeCompare(b.filename));
}

/**
 * Save an uploaded file under `docs/uploads/{slug}/` and append to `.manifest.json`.
 * Used when `PA_LOCAL_DOCUMENT_STORAGE` is set (local dev without Railway).
 */
export function saveLocalDevUpload(
  profileSlug: string,
  originalFilename: string,
  bytes: Buffer,
  document_type: string,
  description: string | null,
): LocalManifestItem {
  const safeSlug = safeProfileSlug(profileSlug);
  const dir = localProfileDir(profileSlug);
  mkdirSync(dir, { recursive: true });

  const safeName = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_') || 'upload.bin';
  const filepath = join(dir, safeName);
  writeFileSync(filepath, bytes);

  const item: LocalManifestItem = {
    id: randomUUID(),
    filename: safeName,
    document_type,
    description,
    copyright_status: 'pending',
    created_at: new Date().toISOString(),
    size_label: formatSize(bytes.length),
  };

  const manPath = manifestPath(profileSlug);
  const prev: LocalManifest = existsSync(manPath)
    ? (JSON.parse(readFileSync(manPath, 'utf8')) as LocalManifest)
    : { items: [] };
  if (!Array.isArray(prev.items)) prev.items = [];
  prev.items.push(item);
  writeFileSync(manPath, JSON.stringify(prev, null, 2), 'utf8');

  return item;
}

/** True when frontend should store uploads under repo `docs/uploads` instead of calling Plan Advisor. */
export function useLocalDocumentStorage(): boolean {
  const v = (import.meta.env.PA_LOCAL_DOCUMENT_STORAGE ?? '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}
