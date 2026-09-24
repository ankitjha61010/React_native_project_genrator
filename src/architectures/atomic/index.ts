import type { ArchitectureDefinition } from '../../core/types.js';
import { BASE_GROUPS, DEFAULT_BARRELS } from '../base.js';

const c = 'src/components';

export const atomic: ArchitectureDefinition = {
  id: 'atomic',
  name: 'Atomic Design',
  summary: 'UI built bottom-up from atoms → molecules → organisms → templates → screens.',
  groups: { ...BASE_GROUPS },
  files: {
    'components.AppText': { path: `${c}/atoms/AppText/AppText.tsx` },
    'components.AppIcon': { path: `${c}/atoms/AppIcon/AppIcon.tsx` },
    'components.AppLoader': { path: `${c}/atoms/AppLoader/AppLoader.tsx` },
    'components.FadeInView': { path: `${c}/atoms/FadeInView/FadeInView.tsx` },
    'components.AppButton': { path: `${c}/molecules/AppButton/AppButton.tsx` },
    'components.AppInput': { path: `${c}/molecules/AppInput/AppInput.tsx` },
    'components.LanguageSwitcher': { path: `${c}/molecules/LanguageSwitcher/LanguageSwitcher.tsx` },
    'components.AppHeader': { path: `${c}/organisms/AppHeader/AppHeader.tsx` },
    'components.AppWebView': { path: `${c}/organisms/AppWebView/AppWebView.tsx` },
    'auth.form': { path: `${c}/organisms/LoginForm/LoginForm.tsx` },
    'components.AppScreen': { path: `${c}/templates/AppScreen/AppScreen.tsx` },
    'auth.types': { path: 'src/types/auth.ts' },
    'auth.schema': { path: 'src/utils/validation/loginSchema.ts' },
    'auth.service': { path: 'src/services/auth/authService.ts' },
    'auth.logic': { path: 'src/hooks/useLogin.ts' },
  },
  barrels: DEFAULT_BARRELS,
  docs: {
    concepts: [
      { title: 'Atoms', body: 'The smallest building blocks that cannot be broken down further: `AppText`, `AppIcon`, `AppLoader`. They only depend on the theme.' },
      { title: 'Molecules', body: 'Small groups of atoms working together as a unit: `AppButton` (text + loader), `AppInput` (label + field + error), `LanguageSwitcher`.' },
      { title: 'Organisms', body: 'Distinct, self-contained sections of an interface composed of molecules and atoms: `AppHeader`, `LoginForm`, `AppWebView`.' },
      { title: 'Templates', body: 'Page-level layouts that place organisms without real content: `AppScreen` handles safe areas, keyboard avoidance and scrolling.' },
      { title: 'Screens', body: 'Templates filled with real data and connected to hooks/services. Screens live in `src/screens` and are the only level that talks to navigation.' },
    ],
    rules: {
      uiComponents: '`src/components/{atoms,molecules,organisms,templates}` – a component may only import from its own level or lower levels.',
      businessLogic: 'Hooks in `src/hooks` (e.g. `useLogin`) and services in `src/services`. Components stay presentational.',
      apiCalls: '`src/services/api/apiClient.ts` is the single HTTP client; feature services such as `src/services/auth` call it.',
      state: '`src/store` (if a state library was selected), accessed via `src/hooks/useAuthSession.ts`.',
      navigation: '`src/navigation` – navigators and typed route params.',
    },
  },
};
