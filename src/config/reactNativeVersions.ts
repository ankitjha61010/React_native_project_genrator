/**
 * React Native compatibility profiles.
 *
 * Every profile is a set of package versions that were installed and type-checked
 * together. Upgrading the generator means adding a new profile here (and running
 * `npm run verify:projects`) – never bumping a single package in isolation.
 */
export interface ReactNativeProfile {
  /** Exact React Native version passed to `@react-native-community/cli init`. */
  reactNative: string;
  react: string;
  /** `@react-native-community/cli` version used for `init`. */
  cli: string;
  /** Minimum Node version required by this React Native release. */
  node: string;
  /** Exact versions for every package the generator may add. */
  packages: Record<string, string>;
  /** React Native range each native library officially supports (semver). */
  supportedRange: Record<string, string>;
  native: {
    /** com.google.gms:google-services Gradle plugin. */
    googleServicesPlugin: string;
  };
}

const ECOSYSTEM_2026_08: Record<string, string> = {
  '@react-navigation/native': '7.4.1',
  '@react-navigation/native-stack': '7.19.2',
  '@react-navigation/bottom-tabs': '7.19.2',
  '@react-navigation/drawer': '7.14.2',
  'react-native-screens': '4.28.0',
  'react-native-safe-area-context': '5.10.0',
  'react-native-gesture-handler': '3.3.0',
  'react-native-reanimated': '4.7.0',
  'react-native-worklets': '0.13.0',
  '@react-native-firebase/app': '26.4.0',
  '@react-native-firebase/messaging': '26.4.0',
  '@react-native-firebase/analytics': '26.4.0',
  '@react-native-async-storage/async-storage': '3.1.1',
  axios: '1.20.0',
  'react-native-flash-message': '0.4.2',
  'prop-types': '15.8.1',
  i18next: '26.4.2',
  'react-i18next': '17.0.15',
  'react-native-localize': '3.7.2',
  'react-native-image-picker': '8.2.1',
  '@react-native-community/image-editor': '4.3.1',
  '@shopify/react-native-skia': '2.13.0',
  'react-native-file-access': '4.0.4',
  'react-native-permissions': '5.6.2',
  'react-native-webview': '14.0.1',
  '@likashefqet/react-native-image-zoom': '4.3.0',
  '@react-native-vector-icons/material-design-icons': '13.1.4',
  'react-hook-form': '7.88.0',
  zod: '4.6.5',
  '@hookform/resolvers': '5.9.1',
  '@reduxjs/toolkit': '2.12.0',
  'react-redux': '9.3.0',
  zustand: '5.0.15',
  'react-native-dotenv': '3.4.11',
  'babel-plugin-module-resolver': '5.0.3',
  '@babel/plugin-transform-export-namespace-from': '7.29.7',
  'crypto-js': '4.2.0',
  '@types/crypto-js': '4.2.2',
  '@notifee/react-native': '9.1.8',
  'react-native-mmkv': '4.3.2',
  'react-native-nitro-modules': '0.37.1',
  '@react-native-google-signin/google-signin': '16.1.5',
  'react-native-fbsdk-next': '13.4.3',
  '@invertase/react-native-apple-authentication': '2.5.1',
  'socket.io-client': '^4.8.1',
  // Chat: voice messages (record + play, a Nitro module like MMKV) and "send a file".
  'react-native-nitro-sound': '0.2.20',
  '@react-native-documents/picker': '12.0.2',
  // Google Location SDK (optional).
  'react-native-geolocation-service': '5.3.1',
  // Calling: Agora RTC + iOS CallKit + VoIP push + helpers.
  'react-native-agora': '4.5.2',
  'react-native-callkeep': '4.3.12',
  'react-native-voip-push-notification': '3.3.2',
  'react-native-incall-manager': '4.2.0',
  // OTA Updates
  'react-native-fs': '2.20.0',
  'react-native-zip-archive': '9.5.2',
  'react-native-restart': '0.0.27',
  'react-native-device-info': '15.0.2',
  // Payments (optional): in-app purchases (react-native-iap is a Nitro module) and payment gateways.
  'react-native-iap': '16.7.2',
  'react-native-adapty': '4.2.1',
  '@stripe/stripe-react-native': '0.80.0',
  'react-native-razorpay': '3.0.0',
};

const SUPPORTED_2026_08: Record<string, string> = {
  'react-native-reanimated': '>=0.86.0 <0.89.0',
  'react-native-worklets': '>=0.86.0 <0.89.0',
  'react-native-screens': '>=0.79.0',
  'react-native-gesture-handler': '>=0.79.0',
  'react-native-safe-area-context': '>=0.74.0',
  '@react-native-firebase/app': '>=0.78.0',
};

export const REACT_NATIVE_PROFILES: ReactNativeProfile[] = [
  {
    reactNative: '0.87.1',
    react: '19.2.3',
    cli: '20.2.0',
    node: '>=22.13.0',
    packages: ECOSYSTEM_2026_08,
    supportedRange: SUPPORTED_2026_08,
    native: { googleServicesPlugin: '4.4.4' },
  },
  {
    reactNative: '0.86.3',
    react: '19.2.3',
    cli: '20.2.0',
    node: '>=22.13.0',
    packages: ECOSYSTEM_2026_08,
    supportedRange: SUPPORTED_2026_08,
    native: { googleServicesPlugin: '4.4.4' },
  },
];

export const DEFAULT_REACT_NATIVE_VERSION = REACT_NATIVE_PROFILES[0]!.reactNative;
