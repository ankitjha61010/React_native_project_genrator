import path from 'node:path';
import fs from 'fs-extra';
import { step } from '../cli/logger.js';
import { initGit } from '../generators/gitGenerator.js';
import { GeneratorError } from '../utils/errors.js';
import { CommandError, run } from '../utils/exec.js';
import { prepareBackendContext } from './context.js';
import { buildBackendPackageJson } from './packageJson.js';
import { createBackendPlan, renderBackendPlan, type BackendRenderedFile } from './plan.js';
import type { BackendOptions } from './types.js';

export interface BackendSummary {
  projectDir: string;
  files: number;
  dependenciesInstalled: boolean;
  warnings: string[];
}

/** Renders every backend file in memory (no disk access) – used by generation and --dry-run. */
export async function renderBackend(options: BackendOptions): Promise<{ files: BackendRenderedFile[]; packageJson: Record<string, unknown> }> {
  const ctx = prepareBackendContext(options);
  const files = await renderBackendPlan(ctx, createBackendPlan(ctx));
  return { files, packageJson: buildBackendPackageJson(ctx) };
}

export async function writeBackend(projectDir: string, files: BackendRenderedFile[], packageJson: Record<string, unknown>): Promise<void> {
  for (const file of files) {
    const target = path.join(projectDir, file.path);
    await fs.ensureDir(path.dirname(target));
    await fs.writeFile(target, file.content, 'utf8');
  }
  await fs.writeJson(path.join(projectDir, 'package.json'), packageJson, { spaces: 2 });
}

export async function generateBackend(options: BackendOptions): Promise<BackendSummary> {
  const projectDir = options.projectDir;
  const summary: BackendSummary = { projectDir, files: 0, dependenciesInstalled: false, warnings: [] };

  const { files, packageJson } = await step('Rendering backend templates', () => renderBackend(options), r => `${r.files.length} backend files rendered`);
  await step('Writing backend', () => writeBackend(projectDir, files, packageJson), `Backend written to ${projectDir}`);
  summary.files = files.length + 1;

  if (options.firebaseServiceAccountPath) {
    try {
      const dest = path.join(projectDir, 'firebase-service-account.json');
      await fs.copy(options.firebaseServiceAccountPath, dest);
      summary.files += 1;
    } catch (error) {
      summary.warnings.push(`Could not copy firebase-service-account.json: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (options.installDependencies) {
    try {
      await step(
        'Installing backend dependencies',
        async () => {
          try {
            await run('npm', ['install', '--no-audit', '--no-fund'], { cwd: projectDir });
          } catch (error) {
            throw new GeneratorError('Failed to install the backend dependencies.', {
              reason: error instanceof CommandError ? error.output : String(error),
              tryHints: [`cd ${projectDir}`, 'npm install'],
              cause: error,
            });
          }
        },
        'Backend dependencies installed',
      );
      summary.dependenciesInstalled = true;
    } catch {
      summary.warnings.push('Backend dependencies are NOT installed – run `npm install` in the backend folder.');
    }
  }

  if (options.initGit) {
    const result = await initGit(projectDir).catch(() => 'unavailable' as const);
    if (result === 'unavailable') summary.warnings.push('git was not found, the repository was not initialized.');
  }
  return summary;
}
