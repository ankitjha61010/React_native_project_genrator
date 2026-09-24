import type { RenderedFile } from './fileGenerator.js';
import { writeFiles } from './fileGenerator.js';

/** Files owned by the later, dedicated steps (navigation, screens, Firebase, notifications). */
const DEDICATED_GROUPS = new Set(['navigation', 'screens', 'notification', 'firebase']);
const FIREBASE_ROOT_FILES = /^root\.(firebase|iosEntitlements)/;

export function isArchitectureFile(file: RenderedFile): boolean {
  if (file.group && DEDICATED_GROUPS.has(file.group)) return false;
  if (file.id && FIREBASE_ROOT_FILES.test(file.id)) return false;
  return true;
}

/** Folders, components, services, theme, state, i18n, docs and config files. */
export async function generateArchitecture(projectDir: string, files: RenderedFile[]): Promise<number> {
  const selected = files.filter(isArchitectureFile);
  await writeFiles(projectDir, selected);
  return selected.length;
}
