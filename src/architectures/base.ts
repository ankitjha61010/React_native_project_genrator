import type { GroupId } from '../core/types.js';

/** Default group locations; each architecture overrides what it needs. */
export const BASE_GROUPS: Record<GroupId, string> = {
  root: '.',
  app: 'src/app',
  assets: 'src/assets',
  theme: 'src/theme',
  config: 'src/config',
  types: 'src/types',
  i18n: 'src/i18n',
  utils: 'src/utils',
  hooks: 'src/hooks',
  api: 'src/services/api',
  storage: 'src/services/storage',
  notification: 'src/services/notification',
  permissions: 'src/services/permissions',
  media: 'src/services/media',
  location: 'src/services/location',
  firebase: 'src/services/firebase',
  socket: 'src/services/socket',
  chat: 'src/features/chat',
  calling: 'src/features/calling',
  ota: 'src/features/ota',
  payments: 'src/features/payments',
  components: 'src/components',
  navigation: 'src/navigation',
  screens: 'src/screens',
  auth: 'src/features/auth',
  store: 'src/store',
};

/** Groups whose folder gets an `index.ts` re-exporting every module in it. */
export const DEFAULT_BARRELS: GroupId[] = [
  'theme',
  'components',
  'navigation',
  'api',
  'storage',
  'notification',
  'permissions',
  'media',
  'location',
  'firebase',
  'socket',
];
