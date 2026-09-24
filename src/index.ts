import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { parseArgs } from './cli/args.js';
import { log } from './cli/logger.js';
import { collectOptions } from './cli/prompts.js';
import { describeDryRun } from './generators/dryRun.js';
import { generateProject } from './generators/projectGenerator.js';
import { PACKAGE_ROOT } from './utils/paths.js';

function packageVersion(): string {
  const pkg = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8')) as { version: string };
  return pkg.version;
}

function isPromptCancel(error: unknown): boolean {
  return error instanceof Error && (error.name === 'ExitPromptError' || error.name === 'AbortPromptError');
}

export async function run(argv: string[]): Promise<void> {
  const flags = parseArgs(argv, packageVersion());
  log.banner();

  try {
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
