import path from 'node:path';
import fs from 'fs-extra';
import { TEMPLATES_DIR } from '../utils/paths.js';
import { renderTemplate } from '../utils/templateEngine.js';
import type { BackendRenderContext } from './context.js';
import { BACKEND_MANIFEST } from './manifest.js';

const posix = path.posix;

export interface BackendPlannedFile {
  id: string;
  template: string;
  /** Destination relative to the project root. */
  path: string;
  flags?: Record<string, boolean>;
}

export interface BackendRenderedFile {
  id: string;
  path: string;
  content: string;
}

/** Every file of the backend for these options (paths decided by the architecture). */
export function createBackendPlan(ctx: BackendRenderContext): BackendPlannedFile[] {
  const { options, arch } = ctx;
  const files: BackendPlannedFile[] = [];
  const seen = new Map<string, string>();
  for (const entry of BACKEND_MANIFEST) {
    if (entry.when && !entry.when(ctx)) continue;
    const file = typeof entry.file === 'function' ? entry.file(ctx) : entry.file;
    const dir = entry.layer ? arch.dir(entry.layer, options.framework, entry.feature) : '';
    const dest = posix.normalize(dir ? posix.join(dir, file) : file);
    if (seen.has(dest)) {
      throw new Error(`"${entry.id}" and "${seen.get(dest)}" both write ${dest} (${arch.name}).`);
    }
    seen.set(dest, entry.id);
    files.push({ id: entry.id, template: entry.template.replace('{orm}', options.orm), path: dest, flags: entry.flags });
  }
  return files;
}

/** ESM (nodenext) relative specifier: `../core/logger.js`. */
function importSpecifier(fromFile: string, toFile: string): string {
  const rel = posix.relative(posix.dirname(fromFile), toFile.replace(/\.ts$/, '.js'));
  return rel.startsWith('.') ? rel : `./${rel}`;
}

export async function renderBackendPlan(ctx: BackendRenderContext, plan: BackendPlannedFile[]): Promise<BackendRenderedFile[]> {
  const byId = new Map(plan.map(f => [f.id, f]));
  return Promise.all(
    plan.map(async file => {
      const source = await fs.readFile(path.join(TEMPLATES_DIR, 'backend', file.template), 'utf8');
      const content = renderTemplate(
        source,
        {
          flags: file.flags ? { ...ctx.flags, ...file.flags } : ctx.flags,
          variables: ctx.variables,
          resolveImport(id: string) {
            // `{{IMPORT:path:src/generated/prisma/client.ts}}` – a file that is generated later (Prisma client).
            if (id.startsWith('path:')) return importSpecifier(file.path, id.slice('path:'.length));
            const target = byId.get(id);
            if (!target) {
              throw new Error(`${file.template} imports "${id}", which is not part of this backend (check the {{#if}} guards).`);
            }
            return importSpecifier(file.path, target.path);
          },
          resolveSymbol(id: string) {
            throw new Error(`{{SYMBOL:${id}}} is not supported in backend templates.`);
          },
        },
        `backend/${file.template}`,
      );
      return { id: file.id, path: file.path, content: tidy(content) };
    }),
  );
}

/** Conditional blocks leave runs of blank lines behind – collapse them. */
function tidy(content: string): string {
  return content.replace(/\n{3,}/g, '\n\n');
}
