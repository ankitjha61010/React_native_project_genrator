import fs from 'node:fs';
import path from 'node:path';
import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import { generateBackend, renderBackend } from './backend/generator.js';
import { collectBackendOptions, describeBackend } from './backend/prompts.js';
import type { BackendOptions, ProjectType } from './backend/types.js';
import { parseArgs, type CliFlags } from './cli/args.js';
import { log } from './cli/logger.js';
import { collectOptions } from './cli/prompts.js';
import { describeDryRun } from './generators/dryRun.js';
import { generateProject } from './generators/projectGenerator.js';
import { GeneratorError } from './utils/errors.js';
import { PACKAGE_ROOT } from './utils/paths.js';

function packageVersion(): string {
  const pkg = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8')) as { version: string };
  return pkg.version;
}

function isPromptCancel(error: unknown): boolean {
  return error instanceof Error && (error.name === 'ExitPromptError' || error.name === 'AbortPromptError');
}

/** First question: frontend, backend or both. */
async function chooseProjectType(flags: CliFlags): Promise<ProjectType> {
  if (flags.type) {
    log.success(`Project type: ${chalk.cyan(flags.type)}`);
    return flags.type as ProjectType;
  }
  if (flags.yes) return 'frontend';
  return select<ProjectType>({
    message: 'What do you want to generate?',
    choices: [
      { name: '1. Frontend', value: 'frontend', description: 'React Native app (TypeScript) with the architecture of your choice' },
      { name: '2. Backend', value: 'backend', description: 'NestJS or Express API: database, auth, security, Swagger, tests' },
      { name: '3. Frontend + Backend', value: 'fullstack', disabled: '(coming next – connected frontend + backend)' },
    ],
  });
}

async function runBackend(flags: CliFlags): Promise<void> {
  const options: BackendOptions = await collectBackendOptions(flags);

  if (flags.dryRun) {
    const { files, packageJson } = await renderBackend(options);
    log.newline();
    describeBackend(options).forEach(line => log.info(line));
    log.info(chalk.bold('\nFiles:'));
    files.map(f => f.path).concat('package.json').sort().forEach(p => log.info(chalk.green(`+ ${p}`)));
    const pkg = packageJson as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
    log.info(chalk.bold('\nDependencies:'));
    Object.entries(pkg.dependencies).forEach(([n, v]) => log.info(`  ${n}@${v}`));
    log.info(chalk.bold('Dev dependencies:'));
    Object.entries(pkg.devDependencies).forEach(([n, v]) => log.info(`  ${n}@${v}`));
    log.dim('\nDry run – nothing was written.');
    return;
  }

  if (fs.existsSync(options.projectDir) && fs.readdirSync(options.projectDir).length > 0 && !flags.force) {
    throw new GeneratorError(`The directory ${options.projectDir} already exists and is not empty.`, {
      tryHints: ['Choose another --name / --directory, or pass --force to replace it.'],
    });
  }
  if (flags.force) fs.rmSync(options.projectDir, { recursive: true, force: true });

  log.newline();
  const summary = await generateBackend(options);
  const rel = path.relative(process.cwd(), summary.projectDir) || '.';
  const relative = rel.startsWith('..') ? summary.projectDir : rel;
  const orm = options.orm;

  log.newline();
  log.success(chalk.bold('🚀 Backend successfully generated!'));
  summary.warnings.forEach(w => log.warn(w));
  log.newline();
  log.info(chalk.cyan(`cd ${relative}`));
  if (!summary.dependenciesInstalled) log.info(chalk.cyan('npm install'));
  log.dim('# set DATABASE_URL in .env (a development .env with fresh secrets was created)');
  if (orm !== 'mongoose') log.info(chalk.cyan('npm run db:deploy'));
  if (options.auth !== 'none' || orm === 'mongoose') log.info(chalk.cyan('npm run db:seed'));
  log.info(chalk.cyan('npm run dev'));
  log.newline();
  log.dim(`API: http://localhost:3000/api/v1${options.swagger ? '  ·  Docs: http://localhost:3000/api/docs' : ''}`);
  log.dim('Guide: README.md · docs/ARCHITECTURE.md');
  log.newline();
}

export async function run(argv: string[]): Promise<void> {
  const flags = parseArgs(argv, packageVersion());
  log.banner();

  try {
    const projectType = await chooseProjectType(flags);
    if (projectType === 'fullstack') {
      throw new GeneratorError('Frontend + Backend generation is not available yet.', {
        reason: 'The connected full-stack setup (shared API types, generated frontend API services) is the next phase.',
        tryHints: ['Generate the backend with --type backend and the app with --type frontend for now.'],
      });
    }
    if (projectType === 'backend') {
      await runBackend(flags);
      return;
    }

    const options = await collectOptions(flags);

    if (flags.dryRun) {
      log.newline();
      log.info(await describeDryRun(options));
      return;
    }

    const summary = await generateProject(options);
    const relative = path.relative(process.cwd(), summary.projectDir) || '.';

    log.newline();
    log.success(chalk.bold('Project generated successfully!'));
    summary.warnings.forEach(w => log.warn(w));
    log.newline();
    log.info('🎉 Your React Native project is ready!\n');
    log.info(chalk.cyan(`cd ${relative}`));
    if (!summary.dependenciesInstalled) log.info(chalk.cyan('\nnpm install'));
    if (process.platform === 'darwin' && !summary.podsInstalled) {
      log.info(chalk.cyan('\ncd ios && bundle install && bundle exec pod install && cd ..'));
    }
    log.info(chalk.cyan('\nnpx react-native run-android'));
    log.info('\nor');
    log.info(chalk.cyan('\nnpx react-native run-ios'));
    log.newline();
    log.dim(`Firebase: follow firebase/README.md to enable push notifications${options.analytics ? ' & analytics' : ''}.`);
    log.dim('Architecture guide: docs/ARCHITECTURE.md');
    log.newline();
  } catch (error) {
    if (isPromptCancel(error)) {
      log.warn('Cancelled.');
      process.exitCode = 130;
      return;
    }
    log.error(error);
    process.exitCode = 1;
  }
}
