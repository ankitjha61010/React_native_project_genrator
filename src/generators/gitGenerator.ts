import { commandExists, run } from '../utils/exec.js';

export type GitResult = 'committed' | 'initialized' | 'unavailable';

/** git init + initial commit. The commit is skipped when git has no user configured. */
export async function initGit(projectDir: string): Promise<GitResult> {
  if (!(await commandExists('git'))) {
    return 'unavailable';
  }
  await run('git', ['init', '--quiet'], { cwd: projectDir });
  await run('git', ['add', '-A'], { cwd: projectDir });
  try {
    await run('git', ['commit', '--quiet', '-m', 'Initial commit from rn-architecture-generator'], { cwd: projectDir });
    return 'committed';
  } catch {
    return 'initialized';
  }
}
