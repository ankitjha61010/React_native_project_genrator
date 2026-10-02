import { useCallback, useSyncExternalStore } from 'react';
import { accessStore } from '../services/accessStore';

/** Live access levels: `const { hasAccess } = useAccess(); if (hasAccess('premium')) …` */
export function useAccess() {
  const access = useSyncExternalStore(accessStore.subscribe, accessStore.get);
  const hasAccess = useCallback((level: string) => access.accessLevels.includes(level), [access]);
  return { ...access, hasAccess, refresh: accessStore.refresh };
}
