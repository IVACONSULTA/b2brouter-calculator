import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** Match slug sanitization in admin-documents-local / uploads layout. */
export function safeProfileSlug(profileId: string): string {
  return profileId.replace(/[^a-zA-Z0-9-_]/g, '') || 'profile';
}

/**
 * Absolute file paths under `docs/uploads/{profileId}/` for the CrewAI service.
 */
export function listLocalProfileDocumentAbsolutePaths(profileId: string): {
  rootDir: string;
  paths: string[];
} {
  const slug = safeProfileSlug(profileId);
  const rootDir = resolve(process.cwd(), 'docs', 'uploads', slug);
  if (!existsSync(rootDir)) {
    return { rootDir, paths: [] };
  }
  const paths: string[] = [];
  for (const name of readdirSync(rootDir)) {
    if (name === '.manifest.json' || name.startsWith('.')) continue;
    const full = join(rootDir, name);
    try {
      if (statSync(full).isFile()) paths.push(resolve(full));
    } catch {
      continue;
    }
  }
  return { rootDir: resolve(rootDir), paths };
}
