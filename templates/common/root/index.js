/**
 * @format
 */
import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
{{#if NOTIFICATIONS}}
import { registerNotificationHandlers } from '{{IMPORT:notification.handlers}}';
{{/if}}
import App from './App';
import { name as appName } from './app.json';

{{#if NOTIFICATIONS}}
// Push notifications – registered outside React, before the app renders:
//   messaging().onMessage                   → foreground messages, shown with notifee.displayNotification
//   messaging().setBackgroundMessageHandler → background / quit data messages
//   notifee.onBackgroundEvent               → presses on notifications while the app is in the background
registerNotificationHandlers();

{{/if}}
AppRegistry.registerComponent(appName, () => App);
