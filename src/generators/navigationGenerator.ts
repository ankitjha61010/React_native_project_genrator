import type { RenderedFile } from './fileGenerator.js';
import { writeFiles } from './fileGenerator.js';

/** Stack (Splash → Login → Home) plus Bottom Tab / Drawer templates and typed routes. */
export async function generateNavigation(projectDir: string, files: RenderedFile[]): Promise<void> {
  await writeFiles(
    projectDir,
    files.filter(f => f.group === 'navigation'),
  );
}

export async function generateScreens(projectDir: string, files: RenderedFile[]): Promise<string[]> {
  const screens = files.filter(f => f.group === 'screens');
  await writeFiles(projectDir, screens);
  return screens.map(f => f.id!.replace('screens.', ''));
}
