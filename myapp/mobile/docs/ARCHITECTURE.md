# Layered Architecture

> Presentation → Business → Data, with Infrastructure for platform services.

## Why this structure exists

### Presentation

`src/presentation` – screens, components, navigation, theme and UI hooks. It depends on the Business layer only.

### Business

`src/business` – models, validation rules, business services and application state. It has no React Native UI code.

### Data

`src/data` – API client, repositories and local storage. Repositories hide where data comes from.

### Infrastructure

`src/infrastructure` – platform integrations: notifications, permissions, media, Firebase, i18n and configuration.

## Where things belong

| Question | Answer |
| --- | --- |
| Where do UI components belong? | `src/presentation/components`. |
| Where does business logic belong? | `src/business/services` (e.g. `authService`) and `src/business/validation`. |
| Where do API calls belong? | `src/data/repositories` using `src/data/api/apiClient.ts`. Layers only call downwards: Presentation → Business → Data. |
| Where does state belong? | `src/business/state`, read by the presentation layer via `useAuthSession`. |
| Where does navigation belong? | `src/presentation/navigation`. |

## Folder structure

```text
src/
├── assets/
│   ├── flags/
│   └── fonts/
├── business/
│   ├── models/
│   ├── services/
│   ├── state/
│   │   ├── selectors/
│   │   └── slices/
│   └── validation/
├── data/
│   ├── api/
│   ├── repositories/
│   └── storage/
├── features/
│   ├── auth/
│   │   ├── screens/
│   │   │   ├── ForgotPasswordScreen/
│   │   │   ├── RegisterScreen/
│   │   │   └── ResetPasswordScreen/
│   │   └── services/
│   └── chat/
│       ├── components/
│       │   ├── AudioMessage/
│       │   ├── ChatActions/
│       │   ├── ChatBubble/
│       │   ├── ChatInputBar/
│       │   ├── ChatMediaPreview/
│       │   ├── ChatNotice/
│       │   ├── TypingIndicator/
│       │   └── UserRow/
│       ├── hooks/
│       ├── screens/
│       │   ├── ChatDetailsScreen/
│       │   ├── ChatListScreen/
│       │   ├── ChatRoomScreen/
│       │   ├── CreateGroupScreen/
│       │   ├── GroupInfoScreen/
│       │   └── NewChatScreen/
│       ├── services/
│       ├── types/
│       └── utils/
├── infrastructure/
│   ├── config/
│   ├── firebase/
│   ├── i18n/
│   │   └── locales/
│   │       ├── ar/
│   │       ├── en/
│   │       └── hi/
│   ├── location/
│   ├── media/
│   ├── notification/
│   └── permissions/
├── presentation/
│   ├── app/
│   ├── components/
│   │   ├── AppButton/
│   │   ├── AppHeader/
│   │   ├── AppIcon/
│   │   ├── AppInput/
│   │   ├── AppLoader/
│   │   ├── AppScreen/
│   │   ├── AppText/
│   │   ├── AppWebView/
│   │   ├── CountryPicker/
│   │   ├── FadeInView/
│   │   ├── LanguageSwitcher/
│   │   ├── LegalLinks/
│   │   ├── LocationPicker/
│   │   ├── LoginForm/
│   │   ├── MediaEditorModal/
│   │   ├── MediaPickerModal/
│   │   └── PhoneInput/
│   ├── hooks/
│   ├── navigation/
│   ├── screens/
│   │   ├── ChangePasswordScreen/
│   │   ├── EditProfileScreen/
│   │   ├── HomeScreen/
│   │   ├── LoginScreen/
│   │   ├── NotificationsScreen/
│   │   ├── ProfileScreen/
│   │   ├── SettingsScreen/
│   │   ├── SplashScreen/
│   │   └── WebViewScreen/
│   └── theme/
├── services/
│   └── socket/
├── types/
└── utils/
```

## The login flow, end to end

| Step | File |
| --- | --- |
| Screen (UI only) | `src/presentation/screens/LoginScreen/LoginScreen.tsx` |
| Form component | `src/presentation/components/LoginForm/LoginForm.tsx` |
| Screen logic (`useLogin`) | `src/presentation/hooks/useLogin.ts` |
| Validation (zod) | `src/business/validation/loginSchema.ts` |
| Data access (demo) | `src/business/services/authService.ts` |
| Models / types | `src/business/models/auth.ts` |
| Session state | `src/presentation/hooks/useAuthSession.ts` |
| Persistence | `src/data/storage/sessionStorage.ts` |

## Shared building blocks

- **Theme** – `src/presentation/theme`: the only place colours, spacing, typography (GolosText font families) and shadows are defined. Components read it through `useTheme()` / `useStyles()`.
- **Components** – `src/presentation/components`: `AppText`, `AppButton`, `AppInput`, `AppLoader`, `AppScreen`, `AppHeader`, `AppIcon`, `AppWebView`.
- **Navigation** – `src/presentation/navigation`.
- **i18n** – `src/infrastructure/i18n`: one JSON file per feature and language, rendered via `<AppText intlType="<file>" value="<key>" value1="…" />`.
- **API** – `src/data/api`, **Storage** – `src/data/storage`, **Notifications** – `src/infrastructure/notification`.

## Rules of thumb

- Screens compose components and call one logic hook; they don't call services or axios directly.
- Components receive data through props and never import services.
- Only `AppText` renders text and only `AppIcon` imports the icon library.
- Every value that could be themed comes from the theme.
- Imports use one `@` alias per `src/` folder (e.g. `@presentation/components/AppText`), so files can move without `../../..` chains.
