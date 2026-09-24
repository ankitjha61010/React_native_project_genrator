import chalk from 'chalk';
import gradient from 'gradient-string';
import ora from 'ora';
import { GeneratorError, errorMessage } from '../utils/errors.js';

const BOX = [
  '╔══════════════════════════════════════╗',
  '║     React Native Architecture CLI    ║',
  '║        Build Better. Faster.         ║',
  '╚══════════════════════════════════════╝',
].join('\n');

export const log = {
  banner(): void {
    console.log();
    console.log(gradient(['#6366F1', '#06B6D4']).multiline(BOX));
    console.log();
  },
  info: (message: string) => console.log(message),
  success: (message: string) => console.log(`${chalk.green('✔')} ${message}`),
  warn: (message: string) => console.log(`${chalk.yellow('⚠')} ${chalk.yellow(message)}`),
  dim: (message: string) => console.log(chalk.dim(message)),
  title: (message: string) => console.log(`\n${chalk.bold.cyan(message)}\n`),
  newline: () => console.log(),

  /** Prints an error as: ❌ message / Reason / Try. */
  error(error: unknown): void {
    const lines = [`\n${chalk.red('❌')} ${chalk.red.bold(errorMessage(error))}`];
    if (error instanceof GeneratorError) {
      if (error.details.reason) {
        lines.push('', chalk.bold('Reason:'), chalk.dim(error.details.reason.trim()));
      }
      if (error.details.tryHints?.length) {
        lines.push('', chalk.bold('Try:'), ...error.details.tryHints.map(hint => chalk.cyan(hint)));
      }
    }
    console.error(`${lines.join('\n')}\n`);
  },
};

/** Runs a task behind a spinner: "⠋ Creating…" → "✔ Created". */
export async function step<T>(
  text: string,
  task: () => Promise<T>,
  success: string | ((result: T) => string) = text,
): Promise<T> {
  const spinner = ora({ text: `${text}...`, color: 'cyan' }).start();
  try {
    const result = await task();
    spinner.succeed(typeof success === 'function' ? success(result) : success);
    return result;
  } catch (error) {
    spinner.fail(text);
    throw error;
  }
}
