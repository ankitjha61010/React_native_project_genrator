/**
 * @format
 */
import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import { registerNotificationHandlers } from '@infrastructure/notification/notificationHandlers';
import App from './App';
import { name as appName } from './app.json';

// Push notifications – registered outside React, before the app renders:
//   messaging().onMessage                   → foreground messages, shown with notifee.displayNotification
//   messaging().setBackgroundMessageHandler → background / quit data messages
//   notifee.onBackgroundEvent               → presses on notifications while the app is in the background
registerNotificationHandlers();

// Layout direction follows the selected language – see i18n/direction.ts.

AppRegistry.registerComponent(appName, () => App);
