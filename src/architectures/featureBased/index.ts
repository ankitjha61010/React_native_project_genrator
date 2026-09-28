import type { ArchitectureDefinition } from '../../core/types.js';
import { BASE_GROUPS, DEFAULT_BARRELS } from '../base.js';

const f = 'src/features';

export const featureBased: ArchitectureDefinition = {
  id: 'feature-based',
  name: 'Feature-Based Architecture',
  summary: 'Code grouped by feature (authentication, home…) with a small shared layer.',
  groups: { ...BASE_GROUPS, auth: `${f}/authentication` },
  files: {
    'screens.Login': { path: `${f}/authentication/screens/LoginScreen/LoginScreen.tsx` },
    'screens.Splash': { path: `${f}/splash/screens/SplashScreen/SplashScreen.tsx` },
    'screens.Home': { path: `${f}/home/screens/HomeScreen/HomeScreen.tsx` },
    'screens.WebView': { path: `${f}/webview/screens/WebViewScreen/WebViewScreen.tsx` },
    'screens.Settings': { path: `${f}/settings/screens/SettingsScreen/SettingsScreen.tsx` },
    'screens.Notifications': { path: `${f}/notifications/screens/NotificationsScreen/NotificationsScreen.tsx` },
  },
  keepDirs: [
    `${f}/authentication/constants`,
    `${f}/home/components`,
    `${f}/home/hooks`,
    `${f}/home/services`,
    `${f}/home/types`,
    'src/constants',
  ],
  customBarrels: {
    [`${f}/authentication/index.ts`]: ['screens.Login', 'auth.logic', 'auth.types'],
    [`${f}/home/index.ts`]: ['screens.Home'],
    [`${f}/settings/index.ts`]: ['screens.Settings'],
    [`${f}/notifications/index.ts`]: ['screens.Notifications'],
  },
  barrels: DEFAULT_BARRELS,
  docs: {
    concepts: [
      { title: 'Feature', body: 'A folder in `src/features/<feature>` owns everything a product feature needs. Features expose a public API through their `index.ts`.' },
      { title: 'Components', body: 'Feature specific UI lives in `features/<feature>/components`. Components reused by several features live in `src/components`.' },
      { title: 'Hooks', body: 'Feature logic such as `useLogin` lives in `features/<feature>/hooks`, keeping screens thin.' },
      { title: 'Services', body: 'Feature specific data access (`authService`) lives in `features/<feature>/services` and uses the shared `apiClient`.' },
      { title: 'Types', body: 'Feature models live in `features/<feature>/types`; app-wide types live in `src/types`.' },
    ],
    rules: {
      uiComponents: 'Shared: `src/components`. Feature-only: `src/features/<feature>/components`.',
      businessLogic: '`src/features/<feature>/hooks` and `src/features/<feature>/services`.',
      apiCalls: 'Feature services call the shared `src/services/api/apiClient.ts`. Never call axios from a screen.',
      state: '`src/store` for global state, accessed via `src/hooks/useAuthSession.ts`; feature local state stays in hooks.',
      navigation: '`src/navigation` registers feature screens. Features must not import other features directly – go through their `index.ts`.',
    },
  },
};
