import type { ArchitectureDefinition } from '../../core/types.js';
import { BASE_GROUPS, DEFAULT_BARRELS } from '../base.js';

export const mvvm: ArchitectureDefinition = {
  id: 'mvvm',
  name: 'MVVM',
  summary: 'Views bind to ViewModels (hooks) that expose state and commands built on Models.',
  groups: {
    ...BASE_GROUPS,
    components: 'src/views/components',
    screens: 'src/views/screens',
    store: 'src/models/store',
  },
  files: {
    'auth.types': { path: 'src/models/auth/authModel.ts' },
    'auth.schema': { path: 'src/models/auth/loginSchema.ts' },
    'auth.service': { path: 'src/models/auth/authService.ts' },
    'auth.form': { path: 'src/views/components/LoginForm/LoginForm.tsx' },
    'auth.logic': { path: 'src/viewmodels/auth/useLoginViewModel.ts', symbol: 'useLoginViewModel' },
  },
  barrels: DEFAULT_BARRELS,
  docs: {
    concepts: [
      { title: 'View', body: '`src/views` – screens and components. A view calls exactly one ViewModel hook and renders its state.' },
      { title: 'ViewModel', body: '`src/viewmodels` – hooks such as `useLoginViewModel` exposing observable state (form, loading, errors) and commands (`onSubmit`). No JSX.' },
      { title: 'Model', body: '`src/models` – entities, validation schemas, services and the global store.' },
    ],
    rules: {
      uiComponents: '`src/views/components`.',
      businessLogic: '`src/viewmodels` for presentation logic, `src/models` for domain rules and data access.',
      apiCalls: 'Model services using `src/services/api/apiClient.ts`.',
      state: 'Screen state in ViewModels; global state in `src/models/store` via `useAuthSession`.',
      navigation: '`src/navigation`; ViewModels trigger navigation through typed navigation props.',
    },
  },
};
