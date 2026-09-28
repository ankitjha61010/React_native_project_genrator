import path from 'node:path';
import { COMMON_MANIFEST } from '../config/manifest.js';
import type {
  ArchitectureDefinition,
  GenerationPlan,
  ManifestEntry,
  PlannedContent,
  PlannedFile,
  RenderContext,
} from './types.js';

const posix = path.posix;
const CODE_EXT = /\.(ts|tsx)$/;

function stripCodeExt(p: string): string {
  return p.replace(CODE_EXT, '');
}

/** `a/AppText/AppText.tsx` is imported through its folder: `a/AppText`. */
function isFolderModule(p: string): boolean {
  if (!CODE_EXT.test(p) || p.endsWith('.d.ts')) return false;
  return posix.basename(stripCodeExt(p)) === posix.basename(posix.dirname(p));
}

function moduleSpecifier(p: string): string {
  return isFolderModule(p) ? posix.dirname(p) : stripCodeExt(p);
}

function relativeSpecifier(fromDir: string, target: string): string {
  const rel = posix.relative(fromDir, moduleSpecifier(target));
  return rel.startsWith('.') ? rel : `./${rel}`;
}

function resolveEntry(entry: ManifestEntry, arch: ArchitectureDefinition): PlannedFile {
  const override = arch.files?.[entry.id];
  const groupDir = arch.groups[entry.group];
  const dest = override?.path ?? posix.join(groupDir, entry.file);
  return {
    id: entry.id,
    group: entry.group,
    template: override?.template ?? entry.template,
    path: posix.normalize(dest),
    symbol: override?.symbol ?? entry.symbol,
    ...(entry.binary ? { binary: true } : {}),
  };
}

/** Works out every file of the generated project for an architecture + options. */
export function createPlan(arch: ArchitectureDefinition, ctx: RenderContext): GenerationPlan {
  const allEntries = [...COMMON_MANIFEST, ...(arch.extraFiles ?? [])];
  const manifest = allEntries.filter(e => !e.when || e.when(ctx));
  /** Ids that exist but are switched off by an option (e.g. screens.Notifications without notifications). */
  const optionalIds = new Set(allEntries.filter(e => e.when && !e.when(ctx)).map(e => e.id));

  const files: PlannedFile[] = [];
  const byId = new Map<string, PlannedFile>();
  const byPath = new Map<string, string>();
  for (const entry of manifest) {
    const planned = resolveEntry(entry, arch);
    if (byId.has(planned.id)) {
      throw new Error(`Duplicate file id "${planned.id}" in the ${arch.name} plan.`);
    }
    if (byPath.has(planned.path)) {
      throw new Error(`"${planned.id}" and "${byPath.get(planned.path)}" both write ${planned.path}.`);
    }
    byId.set(planned.id, planned);
    byPath.set(planned.path, planned.id);
    files.push(planned);
  }

  const generated: PlannedContent[] = [];
  const add = (p: string, content: string) => {
    if (byPath.has(p)) return; // a real template always wins over generated content
    byPath.set(p, '<generated>');
    generated.push({ path: p, content });
  };

  // Folder modules: components/AppText/AppText.tsx -> components/AppText/index.ts
  for (const file of files) {
    if (isFolderModule(file.path)) {
      const name = posix.basename(stripCodeExt(file.path));
      add(posix.join(posix.dirname(file.path), 'index.ts'), `export * from './${name}';\n`);
    }
  }

  const barrel = (dir: string, targets: string[]) => {
    const lines = [...new Set(targets.map(t => relativeSpecifier(dir, t)))]
      .sort()
      .map(spec => `export * from '${spec}';`);
    if (lines.length > 0) add(posix.join(dir, 'index.ts'), `${lines.join('\n')}\n`);
  };

  for (const group of arch.barrels ?? []) {
    const dir = arch.groups[group];
    const targets = files
      .filter(f => f.group === group && CODE_EXT.test(f.path) && !f.path.endsWith('.d.ts'))
      .filter(f => f.path.startsWith(`${dir}/`))
      .map(f => f.path);
    barrel(dir, targets);
  }

  for (const [barrelPath, ids] of Object.entries(arch.customBarrels ?? {})) {
    const targets = ids.flatMap(id => {
      const target = byId.get(id);
      if (target) return [target.path];
      if (optionalIds.has(id)) return []; // file disabled by an option
      throw new Error(`Barrel ${barrelPath} references unknown file "${id}".`);
    });
    if (targets.length === 0) continue;
    // A barrel at <dir>/index.ts re-exports relative to <dir>.
    const lines = targets.map(t => `export * from '${relativeSpecifier(posix.dirname(barrelPath), t)}';`);
    add(barrelPath, `${lines.join('\n')}\n`);
  }

  for (const dir of arch.keepDirs ?? []) {
    add(posix.join(dir, '.gitkeep'), '');
  }

  return {
    architecture: arch,
    files,
    generated,
  };
}

/**
 * Folder names that can't become an alias because an npm scope or a build-time module
 * already owns the name (`@types/*`, `@env` from react-native-dotenv).
 */
const RESERVED_ALIASES: Record<string, string> = { types: 'typings', env: 'appEnv' };

/** `components` → `@components`. */
export function aliasName(topLevelDir: string): string {
  return `@${RESERVED_ALIASES[topLevelDir] ?? topLevelDir}`;
}

/** One alias per top-level folder of `src/`: `@components` → `./src/components`. */
export function importAliases(plan: GenerationPlan): Array<{ alias: string; dir: string }> {
  const dirs = new Set(
    allPlannedPaths(plan)
      .filter(p => p.startsWith('src/') && p.split('/').length > 2)
      .map(p => p.split('/')[1]!),
  );
  return [...dirs].sort().map(dir => ({ alias: aliasName(dir), dir: `./src/${dir}` }));
}

/** `{{IMPORT:id}}` → `@components/AppText` (every top-level `src/` folder has an alias). */
export function createImportResolver(plan: GenerationPlan) {
  const byId = new Map(plan.files.map(f => [f.id, f]));
  return {
    resolveImport(id: string): string {
      const file = byId.get(id);
      if (!file) {
        throw new Error(`Template imports "${id}" which is not part of this project (check {{#if}} guards).`);
      }
      if (!file.path.startsWith('src/') || file.path.split('/').length < 3) {
        throw new Error(`"${id}" (${file.path}) is not inside a src/ folder and can't be imported through an alias.`);
      }
      const spec = (file.path.endsWith('.json') ? file.path : moduleSpecifier(file.path)).replace(/\/index$/, '');
      const [, top, ...rest] = spec.split('/');
      return [aliasName(top!), ...rest].join('/');
    },
    resolveSymbol(id: string): string {
      const file = byId.get(id);
      if (!file?.symbol) {
        throw new Error(`No symbol registered for "${id}".`);
      }
      return file.symbol;
    },
  };
}

export function allPlannedPaths(plan: GenerationPlan): string[] {
  return [...plan.files.map(f => f.path), ...plan.generated.map(g => g.path)].sort();
}
