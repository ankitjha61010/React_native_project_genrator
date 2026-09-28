export type ArchitectureId =
  | 'atomic'
  | 'feature-based'
  | 'layered'
  | 'clean'
  | 'mvc'
  | 'mvvm'
  | 'redux'
  | 'modular';

export type StateManagement = 'redux' | 'zustand' | 'context' | 'none';

/** Key-value storage behind `storageService`. */
export type StorageEngine = 'mmkv' | 'async-storage';

export interface FirebaseFiles {
  /** Absolute path to a user supplied google-services.json. */
  androidConfigPath?: string;
  /** Absolute path to a user supplied GoogleService-Info.plist. */
  iosConfigPath?: string;
}

/** Which social login providers the app offers. Apple is iOS-only at runtime. */
export type SocialLoginOption = 'none' | 'google' | 'facebook' | 'google-facebook' | 'google-apple' | 'all';

/** Everything the generators need to know, collected from prompts or CLI flags. */
export interface ProjectOptions {
  appName: string;
  displayName: string;
  packageName: string;
  /** Parent directory the project folder is created in (absolute). */
  parentDir: string;
  architecture: ArchitectureId;
  stateManagement: StateManagement;
  firebase: FirebaseFiles;
  /** @react-native-firebase/analytics + automatic screen tracking. */
  analytics: boolean;
  storage: StorageEngine;
  /** Encrypt API request bodies / decrypt responses with AES (crypto-js). */
  apiEncryption: boolean;
  /** Right-to-left layout support (adds Arabic as a sample RTL language). */
  rtl: boolean;
  /** Light/dark ThemeProvider + `useTheme().setThemeMode()` (persisted). */
  themeContext: boolean;
  /** @react-native-vector-icons/material-design-icons + native font registration. */
  vectorIcons: boolean;
  /** Firebase Cloud Messaging + Notifee push notifications. */
  notifications: boolean;
  /** Email authentication (Sign In, Sign Up, Forgot Password, Reset Password). */
  authEmail: boolean;
  /** Mobile OTP authentication (Phone login, OTP verification, Forgot PIN). */
  authMobile: boolean;
  /** Social login providers (see SOCIAL_LOGIN_CHOICES). */
  socialAuth: SocialLoginOption;
  /** Socket.io client integration. */
  socket: boolean;
  /** Real-time WhatsApp-style chat module with media/audio/video/documents. */
  chat: boolean;
  /** Side drawer menu wrapping the bottom tabs. */
  drawer: boolean;
  initGit: boolean;
  installDependencies: boolean;
  installPods: boolean;
  /** Replace an existing, non-empty target directory (user confirmed). */
  overwrite: boolean;
  reactNativeVersion: string;
}

/** Absolute project directory for the given options. */
export type ProjectDir = string;

/** A template file that ends up in the generated project. */
export interface ManifestEntry {
  /** Stable identifier used by `{{IMPORT:id}}` and architecture overrides. */
  id: string;
  /** Template path relative to the package `templates/` directory. */
  template: string;
  /** Logical group; the architecture decides which directory a group lives in. */
  group: GroupId;
  /** File path relative to the group directory. */
  file: string;
  /** Exported symbol name, used by `{{SYMBOL:id}}`. */
  symbol?: string;
  /** Only include the file when this returns true. */
  when?: (ctx: RenderContext) => boolean;
  /** Copied byte for byte (fonts, images) instead of being rendered. */
  binary?: boolean;
}

export type GroupId =
  | 'root'
  | 'app'
  | 'assets'
  | 'theme'
  | 'config'
  | 'types'
  | 'i18n'
  | 'utils'
  | 'hooks'
  | 'api'
  | 'storage'
  | 'notification'
  | 'permissions'
  | 'media'
  | 'firebase'
  | 'socket'
  | 'chat'
  | 'components'
  | 'navigation'
  | 'screens'
  | 'auth'
  | 'store';

export interface FileOverride {
  /** Destination path relative to the project root. */
  path?: string;
  /** Alternative template (relative to `templates/`). */
  template?: string;
  symbol?: string;
}

export interface ArchitectureDocSection {
  title: string;
  body: string;
}

export interface ArchitectureDefinition {
  id: ArchitectureId;
  name: string;
  summary: string;
  /** Group directory mapping, relative to the project root. */
  groups: Record<GroupId, string>;
  /** Per file overrides (path, template or symbol). */
  files?: Record<string, FileOverride>;
  /** Architecture specific files that don't exist in the common manifest. */
  extraFiles?: ManifestEntry[];
  /** Conventional, intentionally empty folders (a `.gitkeep` is written). */
  keepDirs?: string[];
  /** Groups that get an auto generated `index.ts` barrel in their directory. */
  barrels?: GroupId[];
  /** Extra barrels: output path -> file ids to re-export. */
  customBarrels?: Record<string, string[]>;
  /** Forces a state management solution (Redux architecture). */
  forcedStateManagement?: StateManagement;
  /** Layers/concepts documented in the generated ARCHITECTURE.md. */
  docs: {
    concepts: ArchitectureDocSection[];
    rules: {
      uiComponents: string;
      businessLogic: string;
      apiCalls: string;
      state: string;
      navigation: string;
    };
  };
}

/** A fully resolved file ready to be rendered. */
export interface PlannedFile {
  id: string;
  group: GroupId;
  template: string;
  /** Destination path relative to the project root (POSIX separators). */
  path: string;
  symbol?: string;
  binary?: boolean;
}

/** Plain generated content (barrels, docs, .gitkeep). */
export interface PlannedContent {
  path: string;
  content: string;
}

export interface GenerationPlan {
  architecture: ArchitectureDefinition;
  files: PlannedFile[];
  generated: PlannedContent[];
}

export interface RenderContext {
  options: ProjectOptions;
  architecture: ArchitectureDefinition;
  /** Simple string variables: `{{APP_NAME}}`. */
  variables: Record<string, string>;
  /** Boolean flags for `{{#if FLAG}}` blocks. */
  flags: Record<string, boolean>;
}
