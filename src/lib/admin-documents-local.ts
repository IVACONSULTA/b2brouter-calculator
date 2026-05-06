import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

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

function manifestPath(profileSlug: string): string {
  return join(process.cwd(), 'docs', 'uploads', profileSlug, '.manifest.json');
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
  const safeSlug = profileSlug.replace(/[^a-zA-Z0-9-_]/g, '') || 'profile';
  const dir = join(process.cwd(), 'docs', 'uploads', safeSlug);
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

  const manPath = manifestPath(safeSlug);
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
