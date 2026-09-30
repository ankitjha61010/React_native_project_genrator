import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './navigationTypes';

/** Navigate from outside React components (notifications, API interceptors…). */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function resetToAuth(): void {
  if (navigationRef.isReady()) {
    navigationRef.reset({ index: 0, routes: [{ name: 'Auth' }] });
  }
}

export function openUrlInApp(url: string, title?: string): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Main', { screen: 'WebView', params: { url, title } });
  }
}
