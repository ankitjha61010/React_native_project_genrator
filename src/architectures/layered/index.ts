import type { ArchitectureDefinition } from '../../core/types.js';
import { BASE_GROUPS, DEFAULT_BARRELS } from '../base.js';

export const layered: ArchitectureDefinition = {
  id: 'layered',
  name: 'Layered Architecture',
  summary: 'Presentation → Business → Data, with Infrastructure for platform services.',
  groups: {
    ...BASE_GROUPS,
    app: 'src/presentation/app',
    theme: 'src/presentation/theme',
    components: 'src/presentation/components',
    navigation: 'src/presentation/navigation',
    screens: 'src/presentation/screens',
    hooks: 'src/presentation/hooks',
    store: 'src/business/state',
    api: 'src/data/api',
    storage: 'src/data/storage',
    notification: 'src/infrastructure/notification',
    permissions: 'src/infrastructure/permissions',
    media: 'src/infrastructure/media',
    location: 'src/infrastructure/location',
    firebase: 'src/infrastructure/firebase',
    i18n: 'src/infrastructure/i18n',
    config: 'src/infrastructure/config',
  },
  files: {
    'auth.form': { path: 'src/presentation/components/LoginForm/LoginForm.tsx' },
    'auth.logic': { path: 'src/presentation/hooks/useLogin.ts' },
    'auth.types': { path: 'src/business/models/auth.ts' },
    'auth.schema': { path: 'src/business/validation/loginSchema.ts' },
    'auth.service': { path: 'src/business/services/authService.ts', template: 'architectures/layered/authService.ts' },
  },
  extraFiles: [
    {
      id: 'data.authRepository',
      group: 'root',
      file: 'src/data/repositories/authRepository.ts',
      template: 'architectures/layered/authRepository.ts',
    },
  ],
  barrels: DEFAULT_BARRELS,
  docs: {
    concepts: [
      { title: 'Presentation', body: '`src/presentation` – screens, components, navigation, theme and UI hooks. It depends on the Business layer only.' },
      { title: 'Business', body: '`src/business` – models, validation rules, business services and application state. It has no React Native UI code.' },
      { title: 'Data', body: '`src/data` – API client, repositories and local storage. Repositories hide where data comes from.' },
      { title: 'Infrastructure', body: '`src/infrastructure` – platform integrations: notifications, permissions, media, Firebase, i18n and configuration.' },
    ],
    rules: {
      uiComponents: '`src/presentation/components`.',
      businessLogic: '`src/business/services` (e.g. `authService`) and `src/business/validation`.',
      apiCalls: '`src/data/repositories` using `src/data/api/apiClient.ts`. Layers only call downwards: Presentation → Business → Data.',
      state: '`src/business/state`, read by the presentation layer via `useAuthSession`.',
      navigation: '`src/presentation/navigation`.',
    },
  },
};
