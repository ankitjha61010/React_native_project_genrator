import type { ArchitectureDefinition } from '../../core/types.js';
import { BASE_GROUPS } from '../base.js';

const m = 'src/modules';

export const modular: ArchitectureDefinition = {
  id: 'modular',
  name: 'Modular Architecture',
  summary: 'Self-contained modules with public APIs, on top of Core, Shared and Infrastructure.',
  groups: {
    ...BASE_GROUPS,
    app: 'src/core/app',
    config: 'src/core/config',
    navigation: 'src/core/navigation',
    store: 'src/core/store',
    i18n: 'src/core/i18n',
    theme: 'src/shared/theme',
    components: 'src/shared/components',
    hooks: 'src/shared/hooks',
    utils: 'src/shared/utils',
    types: 'src/shared/types',
    assets: 'src/shared/assets',
    api: 'src/infrastructure/api',
    storage: 'src/infrastructure/storage',
    notification: 'src/infrastructure/notification',
    permissions: 'src/infrastructure/permissions',
    media: 'src/infrastructure/media',
    firebase: 'src/infrastructure/firebase',
    auth: `${m}/auth`,
  },
  files: {
    'screens.Login': { path: `${m}/auth/screens/LoginScreen/LoginScreen.tsx` },
    'screens.Splash': { path: `${m}/startup/screens/SplashScreen/SplashScreen.tsx` },
    'screens.Home': { path: `${m}/home/screens/HomeScreen/HomeScreen.tsx` },
    'screens.WebView': { path: `${m}/webview/screens/WebViewScreen/WebViewScreen.tsx` },
    'screens.Settings': { path: `${m}/settings/screens/SettingsScreen/SettingsScreen.tsx` },
    'screens.Notifications': { path: `${m}/notifications/screens/NotificationsScreen/NotificationsScreen.tsx` },
  },
  customBarrels: {
    [`${m}/auth/index.ts`]: ['screens.Login', 'auth.logic', 'auth.types'],
    [`${m}/startup/index.ts`]: ['screens.Splash'],
    [`${m}/home/index.ts`]: ['screens.Home'],
    [`${m}/webview/index.ts`]: ['screens.WebView'],
    [`${m}/settings/index.ts`]: ['screens.Settings'],
    [`${m}/notifications/index.ts`]: ['screens.Notifications'],
  },
  barrels: ['theme', 'components', 'navigation', 'api', 'storage', 'notification', 'permissions', 'media', 'firebase'],
  docs: {
    concepts: [
      { title: 'Core', body: '`src/core` – the application shell: providers, navigation, global store, configuration and i18n. Core wires modules together.' },
      { title: 'Shared', body: '`src/shared` – reusable, feature-agnostic code: UI components, theme, hooks, utils and types. Shared never imports from modules.' },
      { title: 'Modules', body: '`src/modules/<module>` – independent business modules (auth, home…). Each exposes a public API in its `index.ts`; other code imports only from there.' },
      { title: 'Infrastructure', body: '`src/infrastructure` – technical services: API client, storage, notifications, permissions, media and Firebase.' },
    ],
    rules: {
      uiComponents: 'Shared UI: `src/shared/components`. Module UI: `src/modules/<module>/components`.',
      businessLogic: '`src/modules/<module>/hooks` and `src/modules/<module>/services`.',
      apiCalls: 'Module services call `src/infrastructure/api/apiClient.ts`.',
      state: '`src/core/store`, accessed via `src/shared/hooks/useAuthSession.ts`.',
      navigation: '`src/core/navigation` registers screens exported by module `index.ts` files.',
    },
  },
};
