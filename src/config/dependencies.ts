import type { ArchitectureId, StateManagement, StorageEngine } from '../core/types.js';

/**
 * Which packages a generated project gets. Versions are NOT listed here – they
 * come from the selected React Native profile (see reactNativeVersions.ts).
 */
export const DEPENDENCY_REGISTRY = {
  /** Installed in every generated project. */
  dependencies: [
    // Navigation
    '@react-navigation/native',
    '@react-navigation/native-stack',
    '@react-navigation/bottom-tabs',
    '@react-navigation/drawer',
    'react-native-screens',
    'react-native-safe-area-context',
    'react-native-gesture-handler',
    // Animation
    'react-native-reanimated',
    'react-native-worklets',
    // Firebase / notifications (notifee displays foreground + data-only messages)
    '@react-native-firebase/app',
    '@react-native-firebase/messaging',
    '@notifee/react-native',
    // Networking & storage
    'axios',
    // UI
    'react-native-flash-message',
    'prop-types',
    'react-native-webview',
    // i18n
    'i18next',
    'react-i18next',
    'react-native-localize',
    // Media & permissions (react-native-image-picker is a TurboModule – no patches needed on new RN versions)
    'react-native-image-picker',
    'react-native-permissions',
    // Forms
    'react-hook-form',
    'zod',
    '@hookform/resolvers',
  ],
  devDependencies: [
    'react-native-dotenv',
    'babel-plugin-module-resolver',
    // zod v4 ships `export * as …`, which @react-native/babel-preset doesn't transform.
    '@babel/plugin-transform-export-namespace-from',
  ],
  /** Extra packages required by the chosen state management. */
  stateDependencies: {
    redux: ['@reduxjs/toolkit', 'react-redux'],
    zustand: ['zustand'],
    context: [],
    none: [],
  } satisfies Record<StateManagement, string[]>,
  /** Extra packages required by an architecture itself. */
  architectureDependencies: {
    atomic: [],
    'feature-based': [],
    layered: [],
    clean: [],
    mvc: [],
    mvvm: [],
    redux: ['@reduxjs/toolkit', 'react-redux'],
    modular: [],
  } satisfies Record<ArchitectureId, string[]>,
  /** Extra packages required by optional features. */
  featureDependencies: {
    apiEncryption: { dependencies: ['crypto-js'], devDependencies: ['@types/crypto-js'] },
    vectorIcons: { dependencies: ['@react-native-vector-icons/material-design-icons'], devDependencies: [] },
    analytics: { dependencies: ['@react-native-firebase/analytics'], devDependencies: [] },
    // Switching the native layout direction needs an app restart (I18nManager is read at startup).
    rtl: { dependencies: ['react-native-restart'], devDependencies: [] },
  },
  /** The selected key-value storage. MMKV v4 is a Nitro module. */
  storageDependencies: {
    mmkv: ['react-native-mmkv', 'react-native-nitro-modules'],
    'async-storage': ['@react-native-async-storage/async-storage'],
  } satisfies Record<StorageEngine, string[]>,
} as const;
