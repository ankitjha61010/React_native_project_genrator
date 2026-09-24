import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import { ARCHITECTURES, getArchitecture } from '../architectures/index.js';
import { architectureTree, prepareGeneration } from '../core/context.js';
import type { ArchitectureId, ProjectOptions } from '../core/types.js';
import { log } from './logger.js';

/** Folder tree preview for an architecture (directories under src/, 3 levels deep). */
export function architecturePreview(architecture: ArchitectureId, base: ProjectOptions): string {
  const arch = getArchitecture(architecture);
  const { plan } = prepareGeneration({
    ...base,
    architecture,
    stateManagement: arch.forcedStateManagement ?? base.stateManagement,
  });
  return architectureTree(plan, 3);
}

/** Arrow-key menu → preview → confirm. "No" goes back to the menu. */
export async function chooseArchitecture(base: ProjectOptions, initial?: ArchitectureId): Promise<ArchitectureId> {
  let current: ArchitectureId | undefined = initial;
  for (;;) {
    const choice: ArchitectureId = await select({
      message: 'Select your project architecture:',
      default: current,
      pageSize: ARCHITECTURES.length,
      choices: ARCHITECTURES.map((a, index) => ({
        name: `${index + 1}. ${a.name}`,
        value: a.id,
        description: chalk.dim(a.summary),
      })),
    });

    const arch = getArchitecture(choice);
    log.title(arch.name);
    log.dim(arch.summary);
    log.newline();
    log.info(architecturePreview(choice, base));
    log.newline();

    const confirmed = await select({
      message: 'Use this architecture?',
      choices: [
        { name: 'Yes', value: true },
        { name: 'No, choose another architecture', value: false },
      ],
    });
    if (confirmed) {
      return choice;
    }
    current = choice;
  }
}
