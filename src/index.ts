import fs from 'node:fs';
import path from 'node:path';
import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import { DATABASE_LABELS } from './backend/context.js';
import { generateBackend, renderBackend } from './backend/generator.js';
import { describeMicroservices, generateMicroservices, planMicroservices } from './backend/microservices.js';
import { collectBackendOptions, describeBackend } from './backend/prompts.js';
import type { BackendOptions, ProjectType } from './backend/types.js';
import { parseArgs, type CliFlags } from './cli/args.js';
import { collectFullstackOptions, describeFullstack, generateFullstack } from './fullstack/fullstack.js';
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
      { name: '3. Frontend + Backend', value: 'fullstack', description: 'Both projects in one folder, already connected (API URL, auth, chat, notifications, encryption)' },
    ],
  });
}

async function runBackend(flags: CliFlags): Promise<void> {
  const options: BackendOptions = await collectBackendOptions(flags);

  const micro = options.deployment === 'microservices';
  if (flags.dryRun && micro) {
    log.newline();
    describeBackend(options).forEach(line => log.info(line));
    log.info(chalk.bold('\nWorkspace:'));
    describeMicroservices(planMicroservices(options)).forEach(line => log.info(chalk.green(`+ ${line}`)));
    log.dim('\nDry run – nothing was written.');
    return;
  }
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
  if (micro) {
    const { warnings } = await generateMicroservices(options);
    const rel = path.relative(process.cwd(), options.projectDir) || '.';
    log.newline();
    log.success(chalk.bold('🚀 Microservices generated!'));
    warnings.forEach(w => log.warn(w));
    log.newline();
    log.info(chalk.cyan(`cd ${rel.startsWith('..') ? options.projectDir : rel}`));
    if (options.docker) log.info(chalk.cyan('docker compose up -d db redis') + chalk.dim('   # database server + Redis'));
    else log.dim(`# start ${DATABASE_LABELS[options.database]} + Redis, create the databases (see README.md)`);
    log.info(chalk.cyan('npm install && npm run install:all && npm run setup'));
    log.info(chalk.cyan('npm run dev') + chalk.dim('                     # gateway + every service'));
    log.newline();
    log.dim(`API (gateway): http://localhost:3000/api/v1  ·  Guide: README.md`);
    log.newline();
    return;
  }
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
  if (options.docker) log.info(chalk.cyan(`docker compose up -d db${options.redis ? ' redis' : ''}`) + chalk.dim(`   # ${DATABASE_LABELS[options.database]}${options.redis ? ' + Redis' : ''}`));
  else log.dim(`# start ${DATABASE_LABELS[options.database]}${options.redis ? ' + Redis' : ''} and set DATABASE_URL${options.redis ? ' / REDIS_URL' : ''} in .env (a development .env with fresh secrets was created)`);
  if (orm !== 'mongoose') log.info(chalk.cyan('npm run db:deploy'));
  if (options.auth !== 'none' || orm === 'mongoose') log.info(chalk.cyan('npm run db:seed'));
  log.info(chalk.cyan('npm run dev'));
  log.newline();
  log.dim(`API: http://localhost:3000/api/v1${options.swagger ? '  ·  Docs: http://localhost:3000/api/docs' : ''}`);
  log.dim('Guide: README.md · docs/ARCHITECTURE.md');
  log.newline();
}

async function runFullstack(flags: CliFlags): Promise<void> {
  const options = await collectFullstackOptions(flags);

  if (flags.dryRun) {
    log.newline();
    describeFullstack(options).forEach(line => log.info(line));
    log.info(chalk.bold('\nmobile/'));
    log.info(await describeDryRun(options.frontend));
    log.info(chalk.bold('\nbackend/'));
    if (options.backend.deployment === 'microservices') {
      describeMicroservices(planMicroservices(options.backend)).forEach(line => log.info(chalk.green(`+ backend/${line}`)));
    } else {
      const { files } = await renderBackend(options.backend);
      files.map(f => f.path).sort().forEach(p => log.info(chalk.green(`+ backend/${p}`)));
    }
    log.dim('\nDry run – nothing was written.');
    return;
  }

  if (fs.existsSync(options.rootDir) && fs.readdirSync(options.rootDir).length > 0 && !flags.force) {
    throw new GeneratorError(`The directory ${options.rootDir} already exists and is not empty.`, {
      tryHints: ['Choose another --name / --directory, or pass --force to replace it.'],
    });
  }
  if (flags.force) fs.rmSync(options.rootDir, { recursive: true, force: true });

  log.newline();
  const { warnings } = await generateFullstack(options);
  const rel = path.relative(process.cwd(), options.rootDir) || '.';
  const relative = rel.startsWith('..') ? options.rootDir : rel;

  log.newline();
  log.success(chalk.bold('🚀 Frontend + Backend generated – already connected!'));
  warnings.forEach(w => log.warn(w));
  log.newline();
  log.info(chalk.cyan(`cd ${relative}`));
  const b = options.backend;
  if (b.docker) log.info(chalk.cyan(`docker compose -f backend/docker-compose.yml up -d db${b.redis ? ' redis' : ''}`) + chalk.dim(`   # ${DATABASE_LABELS[b.database]}${b.redis ? ' + Redis' : ''}`));
  else log.dim(`# start ${DATABASE_LABELS[b.database]}${b.redis ? ' + Redis' : ''} yourself – see README.md`);
  if (b.deployment === 'microservices') {
    log.info(chalk.cyan('cd backend && npm install && npm run install:all && npm run setup && npm run dev'));
  } else {
    log.info(chalk.cyan(`cd backend && npm install${options.backend.orm === 'mongoose' ? '' : ' && npm run db:deploy'} && npm run db:seed && npm run dev`));
  }
  log.info(chalk.cyan('cd mobile && npm start') + chalk.dim('         # then npm run android / npm run ios'));
  log.newline();
  log.dim(`Guide: README.md · backend/${options.backend.deployment === 'microservices' ? 'README.md' : 'docs/API.md'}`);
  log.newline();
}

export async function run(argv: string[]): Promise<void> {
  const flags = parseArgs(argv, packageVersion());
  log.banner();

  try {
    const projectType = await chooseProjectType(flags);
    if (projectType === 'fullstack') {
      await runFullstack(flags);
      return;
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
