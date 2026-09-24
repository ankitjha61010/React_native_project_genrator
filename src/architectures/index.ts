import type { ArchitectureDefinition, ArchitectureId } from '../core/types.js';
import { atomic } from './atomic/index.js';
import { clean } from './clean/index.js';
import { featureBased } from './featureBased/index.js';
import { layered } from './layered/index.js';
import { modular } from './modular/index.js';
import { mvc } from './mvc/index.js';
import { mvvm } from './mvvm/index.js';
import { redux } from './redux/index.js';

/** Display order used by the CLI menu. */
export const ARCHITECTURES: ArchitectureDefinition[] = [atomic, featureBased, layered, clean, mvc, mvvm, redux, modular];

export const ARCHITECTURE_IDS = ARCHITECTURES.map(a => a.id);

export function getArchitecture(id: string): ArchitectureDefinition {
  const found = ARCHITECTURES.find(a => a.id === id);
  if (!found) {
    throw new Error(`Unknown architecture "${id}". Available: ${ARCHITECTURE_IDS.join(', ')}`);
  }
  return found;
}

export function isArchitectureId(id: string): id is ArchitectureId {
  return (ARCHITECTURE_IDS as string[]).includes(id);
}
