import type { ArchitectureDefinition } from '../../core/types.js';
import { BASE_GROUPS, DEFAULT_BARRELS } from '../base.js';

export const mvc: ArchitectureDefinition = {
  id: 'mvc',
  name: 'MVC',
  summary: 'Models hold data/rules, Views render, Controllers (hooks) connect them.',
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
    'auth.logic': { path: 'src/controllers/auth/useLoginController.ts', symbol: 'useLoginController' },
  },
  barrels: DEFAULT_BARRELS,
  docs: {
    concepts: [
      { title: 'Model', body: '`src/models` – data shapes, validation rules, data access (`authService`) and the global store.' },
      { title: 'View', body: '`src/views` – screens and components. Views render what the controller gives them and forward user events.' },
      { title: 'Controller', body: '`src/controllers` – hooks such as `useLoginController` that handle user input, call models and decide what happens next (navigation, messages).' },
    ],
    rules: {
      uiComponents: '`src/views/components`.',
      businessLogic: '`src/controllers` for flow/orchestration, `src/models` for rules and data.',
      apiCalls: 'Model services (`src/models/**/…Service.ts`) using `src/services/api/apiClient.ts`.',
      state: '`src/models/store`, accessed via `src/hooks/useAuthSession.ts`.',
      navigation: '`src/navigation`; controllers trigger navigation, views never import navigators.',
    },
  },
};
