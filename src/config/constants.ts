import type { StateManagement, StorageEngine } from '../core/types.js';

export const CLI_NAME = 'rn-architecture-generator';

export const STATE_MANAGEMENT_LABELS: Record<StateManagement, string> = {
  redux: 'Redux Toolkit',
  zustand: 'Zustand',
  context: 'Context API',
  none: 'None',
};

export const STORAGE_LABELS: Record<StorageEngine, string> = {
  mmkv: 'MMKV (react-native-mmkv – fast, synchronous)',
  'async-storage': 'AsyncStorage (@react-native-async-storage/async-storage)',
};

export const STORAGE_IDS = Object.keys(STORAGE_LABELS) as StorageEngine[];

export function isStorageEngine(value: string): value is StorageEngine {
  return (STORAGE_IDS as string[]).includes(value);
}

export const STATE_MANAGEMENT_IDS = Object.keys(STATE_MANAGEMENT_LABELS) as StateManagement[];

export function isStateManagement(value: string): value is StateManagement {
  return (STATE_MANAGEMENT_IDS as string[]).includes(value);
}
