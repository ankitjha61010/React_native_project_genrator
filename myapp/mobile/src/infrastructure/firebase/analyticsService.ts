import { getAnalytics, logEvent, logScreenView } from '@react-native-firebase/analytics';
import { isFirebaseConfigured, warnFirebaseNotConfigured } from '@infrastructure/firebase/firebaseService';

/** Firebase Analytics. Screens are tracked automatically by AppNavigator. */
export const analyticsService = {
  async logEvent(name: string, params?: Record<string, string | number | boolean>): Promise<void> {
    if (!isFirebaseConfigured()) return warnFirebaseNotConfigured();
    await logEvent(getAnalytics(), name, params);
  },

  async logScreen(screenName: string): Promise<void> {
    if (!isFirebaseConfigured()) return warnFirebaseNotConfigured();
    await logScreenView(getAnalytics(), { screen_name: screenName, screen_class: screenName });
  },
};
