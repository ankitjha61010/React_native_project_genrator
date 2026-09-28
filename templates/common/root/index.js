/**
 * @format
 */
import 'react-native-gesture-handler';
{{#if RTL}}
import { AppRegistry } from 'react-native';
{{else}}
import { AppRegistry, I18nManager } from 'react-native';
{{/if}}
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
{{#if RTL}}
// Layout direction follows the selected language – see i18n/direction.ts.
{{else}}
// This app has no right-to-left language: keep it left-to-right even on an RTL device
// (Arabic, Hebrew, Urdu…) or after an older RTL build of the same bundle id, otherwise
// the native stack headers show a mirrored back arrow.
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);
{{/if}}

AppRegistry.registerComponent(appName, () => App);
