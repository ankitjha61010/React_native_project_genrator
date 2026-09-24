import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Package root (works from both `src/` via tsx/vitest and compiled `dist/`). */
export const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const TEMPLATES_DIR = path.join(PACKAGE_ROOT, 'templates');

export function expandHome(p: string): string {
  if (p === '~') {
    return os.homedir();
  }
  if (p.startsWith('~/')) {
    return path.join(os.homedir(), p.slice(2));
  }
  return p;
}

export function resolveUserPath(p: string, cwd = process.cwd()): string {
  return path.resolve(cwd, expandHome(p.trim() || '.'));
}

export function toPosix(p: string): string {
  return p.split(path.sep).join('/');
}
