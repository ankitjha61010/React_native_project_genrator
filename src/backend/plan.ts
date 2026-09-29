import path from 'node:path';
import fs from 'fs-extra';
import { format } from 'prettier';
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
  /** Written into this file (id) instead of its own – see `mergeInto` in the manifest. */
  mergedInto?: string;
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
  const merges = new Map<BackendPlannedFile, string[]>();
  for (const entry of BACKEND_MANIFEST) {
    if (entry.when && !entry.when(ctx)) continue;
    const file = typeof entry.file === 'function' ? entry.file(ctx) : entry.file;
    const dir = entry.layer ? arch.dir(entry.layer, options.framework, entry.feature) : '';
    const planned: BackendPlannedFile = { id: entry.id, template: entry.template.replace('{orm}', options.orm), path: posix.normalize(dir ? posix.join(dir, file) : file), flags: entry.flags };
    files.push(planned);
    if (entry.mergeInto && ctx.flags.SIMPLE) merges.set(planned, entry.mergeInto);
  }

  const byId = new Map(files.map(f => [f.id, f]));
  for (const [file, targets] of merges) {
    const target = targets.map(id => byId.get(id)).find(Boolean);
    if (target) Object.assign(file, { mergedInto: target.id, path: target.path });
  }

  const seen = new Map<string, string>();
  for (const file of files) {
    if (file.mergedInto) continue;
    if (seen.has(file.path)) {
      throw new Error(`"${file.id}" and "${seen.get(file.path)}" both write ${file.path} (${arch.name}).`);
    }
    seen.set(file.path, file.id);
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
  const rendered = await Promise.all(
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

  // Interfaces merged into their implementation (simple architectures).
  const output = new Map(rendered.map(file => [file.id, file]));
  for (const file of plan) {
    if (!file.mergedInto) continue;
    const target = output.get(file.mergedInto)!;
    output.set(target.id, { ...target, content: mergeModules(target.path, output.get(file.id)!.content, target.content) });
    output.delete(file.id);
  }
  // Readable output: one import per module, formatted like `npm run format` would.
  return Promise.all(
    [...output.values()].map(async file =>
      file.path.endsWith('.ts') ? { ...file, content: await format(combineImports(file.content), { filepath: file.path, ...PRETTIER_OPTIONS }) } : file,
    ),
  );
}

/** The generated project's .prettierrc. */
const PRETTIER_OPTIONS = { singleQuote: true, trailingComma: 'all', printWidth: 120 } as const;

// ── merging two modules into one file ─────────────────────────────────────────

interface NamedImport {
  names: Array<{ name: string; type: boolean }>;
  from: string;
}

const NAMED_IMPORT = /^import (type )?\{ ?([^}]*?) ?\} from '([^']+)';$/;

/** The leading import statements (one string each, even when written over several lines) and the rest. */
function splitImports(content: string): { imports: string[]; body: string } {
  const lines = content.split('\n');
  const imports: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.trim() === '' || line.startsWith('/// <reference')) {
      if (line.trim()) imports.push(line);
      i++;
    } else if (line.startsWith('import ')) {
      let statement = line;
      while (!statement.trimEnd().endsWith(';') && i + 1 < lines.length) statement += ` ${lines[++i]!.trim()}`;
      imports.push(statement.replace(/\{\s+/, '{ ').replace(/,?\s+\}/, ' }'));
      i++;
    } else {
      break;
    }
  }
  return { imports, body: lines.slice(i).join('\n').trim() };
}

/** Named imports of the same module → one statement (`import type` only when every name is a type). */
function groupImports(lines: string[], self?: string): string[] {
  const named = new Map<string, NamedImport>();
  const other: string[] = [];
  for (const line of lines) {
    const match = NAMED_IMPORT.exec(line);
    if (!match) {
      if (!other.includes(line)) other.push(line);
      continue;
    }
    const [, typeOnly, list, from] = match;
    if (from === self) continue;
    const entry = named.get(from!) ?? { names: [], from: from! };
    for (const raw of list!.split(',').map(n => n.trim()).filter(Boolean)) {
      const type = Boolean(typeOnly) || raw.startsWith('type ');
      const name = raw.replace(/^type /, '');
      const existing = entry.names.find(n => n.name === name);
      if (existing) existing.type &&= type;
      else entry.names.push({ name, type });
    }
    named.set(from!, entry);
  }
  return [
    ...other,
    ...[...named.values()].map(({ names, from }) =>
      names.every(n => n.type) ? `import type { ${names.map(n => n.name).join(', ')} } from '${from}';` : `import { ${names.map(n => (n.type ? `type ${n.name}` : n.name)).join(', ')} } from '${from}';`,
    ),
  ];
}

/** Several imports of one module (from `{{#if}}` blocks) → one import. */
function combineImports(content: string): string {
  const { imports, body } = splitImports(content);
  const modules = imports.map(line => NAMED_IMPORT.exec(line)?.[3]).filter(Boolean);
  if (new Set(modules).size === modules.length) return content;
  return `${groupImports(imports).join('\n')}\n\n${body}\n`;
}

/**
 * `first` (an interface) + `second` (its implementation) as one module at `path`: imports are
 * combined per module, imports of the file itself are dropped, `first`'s code comes first.
 */
function mergeModules(path: string, first: string, second: string): string {
  const a = splitImports(first);
  const b = splitImports(second);
  const imports = groupImports([...b.imports, ...a.imports], importSpecifier(path, path));
  return `${imports.length ? `${imports.join('\n')}\n\n` : ''}${a.body}\n\n${b.body}\n`;
}

/** Conditional blocks leave runs of blank lines behind – collapse them. */
function tidy(content: string): string {
  return content.replace(/\n{3,}/g, '\n\n');
}
