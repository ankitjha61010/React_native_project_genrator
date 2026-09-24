import { spawn } from 'node:child_process';
import { GeneratorError } from './errors.js';

export interface RunOptions {
  cwd?: string;
  /** Stream output to the terminal instead of capturing it. */
  inherit?: boolean;
  env?: NodeJS.ProcessEnv;
}

export interface RunResult {
  stdout: string;
  stderr: string;
}

const isWindows = process.platform === 'win32';

/** Runs a command without a shell (no quoting issues). Rejects with the output tail. */
export function run(command: string, args: string[], options: RunOptions = {}): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(isWindows && !command.endsWith('.exe') ? `${command}.cmd` : command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: options.inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      shell: isWindows,
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', chunk => (stdout += chunk));
    child.stderr?.on('data', chunk => (stderr += chunk));
    child.on('error', error => reject(error));
    child.on('close', code => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      const tail = `${stderr}\n${stdout}`.trim().split('\n').slice(-25).join('\n');
      reject(new CommandError(`${command} ${args.join(' ')}`, code, tail));
    });
  });
}

export class CommandError extends Error {
  constructor(
    readonly command: string,
    readonly exitCode: number | null,
    readonly output: string,
  ) {
    super(`"${command}" exited with code ${exitCode}\n${output}`);
    this.name = 'CommandError';
  }
}

export async function commandExists(command: string): Promise<boolean> {
  try {
    await run(isWindows ? 'where' : 'which', [command]);
    return true;
  } catch {
    return false;
  }
}

export async function assertCommand(command: string, installHint: string): Promise<void> {
  if (!(await commandExists(command))) {
    throw new GeneratorError(`"${command}" was not found on your PATH.`, { tryHints: [installHint] });
  }
}
