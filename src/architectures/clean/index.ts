import type { ArchitectureDefinition } from '../../core/types.js';
import { BASE_GROUPS, DEFAULT_BARRELS } from '../base.js';

export const clean: ArchitectureDefinition = {
  id: 'clean',
  name: 'Clean Architecture',
  summary: 'Domain (entities, use cases) at the centre; Data and Presentation depend on it.',
  groups: {
    ...BASE_GROUPS,
    app: 'src/presentation/app',
    theme: 'src/presentation/theme',
    components: 'src/presentation/components',
    navigation: 'src/presentation/navigation',
    screens: 'src/presentation/screens',
    hooks: 'src/presentation/hooks',
    store: 'src/presentation/state',
    api: 'src/data/api',
    storage: 'src/data/storage',
    notification: 'src/core/notification',
    permissions: 'src/core/permissions',
    media: 'src/core/media',
    location: 'src/core/location',
    firebase: 'src/core/firebase',
    i18n: 'src/core/i18n',
    config: 'src/core/config',
    utils: 'src/core/utils',
    types: 'src/core/types',
  },
  files: {
    'auth.types': { path: 'src/domain/entities/Auth.ts' },
    'auth.schema': { path: 'src/presentation/validation/loginSchema.ts' },
    'auth.service': {
      path: 'src/data/repositories/AuthRepositoryImpl.ts',
      template: 'architectures/clean/AuthRepositoryImpl.ts',
      symbol: 'authRepository',
    },
    'auth.form': { path: 'src/presentation/components/LoginForm/LoginForm.tsx' },
    'auth.logic': { path: 'src/presentation/hooks/useLogin.ts', template: 'architectures/clean/useLogin.ts' },
  },
  extraFiles: [
    {
      id: 'domain.authRepository',
      group: 'root',
      file: 'src/domain/repositories/AuthRepository.ts',
      template: 'architectures/clean/AuthRepository.ts',
    },
    {
      id: 'domain.loginUseCase',
      group: 'root',
      file: 'src/domain/usecases/loginUseCase.ts',
      template: 'architectures/clean/loginUseCase.ts',
    },
  ],
  barrels: DEFAULT_BARRELS,
  docs: {
    concepts: [
      { title: 'Presentation', body: '`src/presentation` – screens, components, navigation, hooks and UI state. It calls use cases, never repositories or the API directly.' },
      { title: 'Domain', body: '`src/domain` – entities, repository interfaces and use cases. Pure TypeScript with no React, React Native or axios imports. It depends on nothing.' },
      { title: 'Data', body: '`src/data` – repository implementations, API client and storage. It implements the interfaces declared in the domain.' },
    ],
    rules: {
      uiComponents: '`src/presentation/components`.',
      businessLogic: '`src/domain/usecases` (e.g. `loginUseCase`). Dependencies always point inwards, towards the domain.',
      apiCalls: '`src/data/repositories` via `src/data/api/apiClient.ts`.',
      state: '`src/presentation/state`, read via `src/presentation/hooks/useAuthSession.ts`.',
      navigation: '`src/presentation/navigation`. Cross-cutting services (notifications, i18n, config) live in `src/core`.',
    },
  },
};
