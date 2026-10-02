import path from 'node:path';
import fs from 'fs-extra';
import { log, step } from '../cli/logger.js';
import { run } from '../utils/exec.js';
import { TEMPLATES_DIR } from '../utils/paths.js';
import { renderTemplate } from '../utils/templateEngine.js';

export interface AdminOptions {
  adminDir: string;
  techStack: 'react' | 'next';
  appName: string;
  displayName: string;
  apiBaseUrl: string;
  ota: boolean;
  installDependencies?: boolean;
}

export interface AdminSummary {
  adminDir: string;
  files: number;
  dependenciesInstalled: boolean;
  warnings: string[];
}

async function listFilesRecursive(dir: string, base = ''): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const rel = path.join(base, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(path.join(dir, entry.name), rel)));
    } else {
      files.push(rel);
    }
  }
  return files;
}

export async function generateAdminPanel(options: AdminOptions): Promise<AdminSummary> {
  const adminDir = options.adminDir;
  const templateRoot = path.join(TEMPLATES_DIR, 'admin', options.techStack);
  const summary: AdminSummary = { adminDir, files: 0, dependenciesInstalled: false, warnings: [] };

  if (!(await fs.pathExists(templateRoot))) {
    summary.warnings.push(`Admin template for ${options.techStack} was not found at ${templateRoot}`);
    return summary;
  }

  const templateFiles = await listFilesRecursive(templateRoot);

  const variables: Record<string, string> = {
    APP_NAME: options.appName,
    APP_SLUG: options.appName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    DISPLAY_NAME: options.displayName,
    API_BASE_URL: options.apiBaseUrl,
  };

  const flags: Record<string, boolean> = {
    OTA: Boolean(options.ota),
    REACT: options.techStack === 'react',
    NEXT: options.techStack === 'next',
  };

  const templateData = {
    variables,
    flags,
    resolveImport: () => '',
    resolveSymbol: () => '',
  };

  await step(
    `Generating Admin Panel (${options.techStack === 'next' ? 'Next.js' : 'React + Vite'})`,
    async () => {
      for (const relPath of templateFiles) {
        const srcPath = path.join(templateRoot, relPath);
        const destPath = path.join(adminDir, relPath);
        await fs.ensureDir(path.dirname(destPath));

        const isBinary = /\.(png|jpg|jpeg|gif|ico|webp|svg|woff|woff2|ttf|eot)$/i.test(relPath);
        if (isBinary) {
          await fs.copyFile(srcPath, destPath);
        } else {
          const content = await fs.readFile(srcPath, 'utf8');
          const rendered = renderTemplate(content, templateData, relPath);
          await fs.writeFile(destPath, rendered, 'utf8');
        }
        summary.files += 1;
      }
    },
    `${summary.files} admin panel files written to ${adminDir}`,
  );

  if (options.installDependencies) {
    try {
      await step(
        'Installing Admin Panel dependencies',
        async () => {
          await run('npm', ['install', '--no-audit', '--no-fund'], { cwd: adminDir });
        },
        'Admin Panel dependencies installed',
      );
      summary.dependenciesInstalled = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      summary.warnings.push(`Could not install admin panel dependencies: ${msg}`);
      log.warn(`Run 'npm install' inside ${adminDir} manually.`);
    }
  }

  return summary;
}
