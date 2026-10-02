import type { InAppPurchaseProvider, PaymentCredentials, PaymentGateway } from '../config/payments.js';
import type { SocialCredentials, SocialProviders } from '../config/socialAuth.js';

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
  /** Folder name of the project (default: appName). Full-stack: `mobile`. */
  directoryName?: string;
  /** API_BASE_URL written to .env (full-stack: the generated backend). */
  apiBaseUrl?: string;
  /** Full-stack: the backend's API_ENCRYPTION_KEY / IV, so both sides match out of the box. */
  apiEncryptionSecrets?: { key: string; iv: string };
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
  /** Social login providers – each one on or off. */
  socialAuth: SocialProviders;
  /** Entered while generating ("Configure"); skipped providers keep YOUR_… placeholders. */
  socialCredentials: SocialCredentials;
  /** Socket.io client integration. */
  socket: boolean;
  /** Real-time WhatsApp-style chat module with media/audio/video/documents. */
  chat: boolean;
  /** Group chats (needs chat): admins / members, name, image, add / remove members, leave. */
  groupChat: boolean;
  /** Audio calling: one-to-one + group audio calls via Agora, CallKeep/iOS, native Android. */
  audioCall: boolean;
  /** Video calling: one-to-one + group video calls via Agora, CallKeep/iOS, native Android. */
  videoCall: boolean;
  /** Terms & Conditions / Privacy Policy links, read from the backend (GET /legal). */
  termsAndConditions: boolean;
  /** Profile → Delete account (DELETE /users/me). */
  deleteAccount: boolean;
  /**
   * Google Location SDK: current position (Fused Location Provider) + Google Places search for
   * the profile's location. Off: no package, permission, API key or native change is added.
   */
  googleLocation: boolean;
  /** Side drawer menu wrapping the bottom tabs. */
  drawer: boolean;
  /** Over-The-Air (OTA) updates module. */
  ota: boolean;
  /** In-app purchases (store products / subscriptions): none, react-native-iap or Adapty. */
  inAppPurchase: InAppPurchaseProvider;
  /** Payment gateway (cards / UPI / wallets): none, Stripe, Razorpay or PayPal. */
  paymentGateway: PaymentGateway;
  /** Keys entered while generating; missing ones get dummy values (docs/PAYMENTS.md). */
  paymentCredentials: PaymentCredentials;
  /** Admin panel web application. */
  adminPanel: boolean;
  /** Admin panel tech stack choice (react or next). */
  adminTechStack?: 'react' | 'next';
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
  | 'location'
  | 'firebase'
  | 'socket'
  | 'chat'
  | 'calling'
  | 'ota'
  | 'payments'
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
