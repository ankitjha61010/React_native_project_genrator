import path from 'node:path';
import fs from 'fs-extra';
import { createImportResolver } from '../core/plan.js';
import type { PreparedGeneration } from '../core/context.js';
import type { GroupId } from '../core/types.js';
import { TEMPLATES_DIR } from '../utils/paths.js';
import { renderTemplate } from '../utils/templateEngine.js';

export interface RenderedFile {
  path: string;
  /** Buffer for binary files (fonts). */
  content: string | Buffer;
  /** Undefined for generated content (barrels, .gitkeep). */
  id?: string;
  group?: GroupId;
}

/** Renders every file of the plan in memory – nothing touches the disk yet. */
export async function renderPlan({ ctx, plan }: PreparedGeneration): Promise<RenderedFile[]> {
  const resolver = createImportResolver(plan);
  const data = { variables: ctx.variables, flags: ctx.flags, ...resolver };

  const rendered = await Promise.all(
    plan.files.map(async file => {
      if (file.binary) {
        return { id: file.id, group: file.group, path: file.path, content: await fs.readFile(path.join(TEMPLATES_DIR, file.template)) };
      }
      const source = await fs.readFile(path.join(TEMPLATES_DIR, file.template), 'utf8');
      return {
        id: file.id,
        group: file.group,
        path: file.path,
        content: renderTemplate(source, data, file.template),
      };
    }),
  );
  return [...rendered, ...plan.generated.map(g => ({ path: g.path, content: g.content }))];
}

export async function writeFiles(projectDir: string, files: RenderedFile[]): Promise<void> {
  for (const file of files) {
    const target = path.join(projectDir, file.path);
    await (typeof file.content === 'string' ? fs.outputFile(target, file.content, 'utf8') : fs.outputFile(target, file.content));
  }
}
