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
    // Networking
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
    // Native crop for MediaEditorModal (produces the actual cropped file)
    '@react-native-community/image-editor',
    // Full-resolution colour filters for MediaEditorModal (+ writing the result to a file)
    '@shopify/react-native-skia',
    'react-native-file-access',
    'react-native-permissions',
    // Pinch & double-tap zoom for image previews
    '@likashefqet/react-native-image-zoom',
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
    notifications: { dependencies: ['@react-native-firebase/app', '@react-native-firebase/messaging', '@notifee/react-native'], devDependencies: [] },
    analytics: { dependencies: ['@react-native-firebase/app', '@react-native-firebase/analytics'], devDependencies: [] },
    socket: { dependencies: ['socket.io-client'], devDependencies: [] },
    // Voice messages need a recorder / player; "send a file" needs the system document picker.
    // react-native-nitro-sound runs on react-native-nitro-modules (already there for MMKV).
    // Media viewer: native video player (react-native-video), in-app PDF (react-native-pdf + blob-util)
    // and the system viewer for other documents (QuickLook on iOS) – no web views.
    chat: {
      dependencies: [
        'react-native-nitro-sound',
        'react-native-nitro-modules',
        '@react-native-documents/picker',
        '@react-native-documents/viewer',
        '@likashefqet/react-native-image-zoom',
        'react-native-video',
        'react-native-pdf',
        'react-native-blob-util',
        // Video editor: cuts the selected part into a new file before sending (FFmpeg, on the device).
        'react-native-video-trim',
      ],
      devDependencies: [],
    },
    socialGoogle: { dependencies: ['@react-native-google-signin/google-signin'], devDependencies: [] },
    socialFacebook: { dependencies: ['react-native-fbsdk-next'], devDependencies: [] },
    socialApple: { dependencies: ['@invertase/react-native-apple-authentication'], devDependencies: [] },
    // Google Location SDK: Fused Location Provider (Android) / CoreLocation (iOS). Places search is plain HTTPS.
    googleLocation: { dependencies: ['react-native-geolocation-service'], devDependencies: [] },
    // Audio calling: Agora RTC + CallKeep (iOS CallKit) + VoIP push + InCallManager.
    audioCall: {
      dependencies: [
        'react-native-agora',
        'react-native-callkeep',
        'react-native-voip-push-notification',
        'react-native-incall-manager',
      ],
      devDependencies: [],
    },
    // Video calling: Agora RTC + CallKeep (iOS CallKit) + VoIP push + camera + InCallManager.
    videoCall: {
      dependencies: [
        'react-native-agora',
        'react-native-callkeep',
        'react-native-voip-push-notification',
        'react-native-incall-manager',
      ],
      devDependencies: [],
    },
    // Over-The-Air (OTA) updates: file access, zip extraction, instant app reload, native app version.
    // Payments: one in-app purchase SDK and / or one gateway SDK (PayPal needs none – it runs in the web view).
    iapNative: { dependencies: ['react-native-iap', 'react-native-nitro-modules'], devDependencies: [] },
    iapAdapty: { dependencies: ['react-native-adapty'], devDependencies: [] },
    gatewayStripe: { dependencies: ['@stripe/stripe-react-native', 'react-native-webview'], devDependencies: [] },
    gatewayRazorpay: { dependencies: ['react-native-razorpay'], devDependencies: [] },
    ota: {
      dependencies: [
        'react-native-fs',
        'react-native-zip-archive',
        'react-native-restart',
        'react-native-device-info',
      ],
      devDependencies: [],
    },
  },
  /** The selected key-value storage. MMKV v4 is a Nitro module. */
  storageDependencies: {
    mmkv: ['react-native-mmkv', 'react-native-nitro-modules'],
    'async-storage': ['@react-native-async-storage/async-storage'],
  } satisfies Record<StorageEngine, string[]>,
} as const;
