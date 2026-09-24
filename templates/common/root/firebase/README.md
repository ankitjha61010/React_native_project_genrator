# Firebase setup – {{DISPLAY_NAME}}

The app works without Firebase: every Firebase call is guarded by `isFirebaseConfigured()`, so
{{#if ANALYTICS}}analytics and push notifications are{{else}}push notifications are{{/if}} disabled until the files below are in place.
**No real credentials are included in this project** – the `*.example` files only show the format.

## 1. Create a Firebase project

1. Go to https://console.firebase.google.com and create a project.
2. Enable **Cloud Messaging** (and Google Analytics if you want analytics).

## 2. Android

1. *Project settings → Add app → Android*, package name: `{{PACKAGE_NAME}}`.
2. Download `google-services.json`.
3. Replace the example: copy it to **`android/app/google-services.json`**.

The Google Services Gradle plugin is already configured and is applied automatically as soon as
the file exists (see `android/app/build.gradle`).

## 3. iOS

1. *Project settings → Add app → iOS*, bundle id: `{{PACKAGE_NAME}}`.
2. Download `GoogleService-Info.plist`.
3. Replace the example: drag it into Xcode under the **{{APP_NAME}}** group, tick
   *Copy items if needed* and the **{{APP_NAME}}** target. (Copying the file in Finder is not enough –
   it must be part of the target.)
4. `cd ios && bundle exec pod install`.

`AppDelegate.swift` calls `FirebaseApp.configure()` only when the plist is bundled.

## 4. Configure Firebase Messaging

### Android
- Nothing else is required. `POST_NOTIFICATIONS` (Android 13+) is declared in the manifest and requested
  at runtime by `notificationService.initialize()`.
- Optional: a custom notification icon/colour via `com.google.firebase.messaging.default_notification_icon`
  meta-data in `AndroidManifest.xml`.

### iOS (requires a paid Apple Developer account)
These steps can't be automated because they need your Apple account:

1. Apple Developer → *Keys* → create an **APNs key**; upload it in Firebase → *Project settings → Cloud Messaging*.
2. In Xcode → target **{{APP_NAME}}** → *Signing & Capabilities*:
   - add **Push Notifications** (Xcode creates the entitlements file – `App.entitlements.example` shows the result),
   - add **Background Modes** and tick **Remote notifications** (`UIBackgroundModes` is already in Info.plist).
3. Push notifications don't work on the iOS simulator for FCM tokens in all Xcode versions – test on a device.

## 5. Test

1. Run the app, log in – Metro prints `FCM token …`.
2. Firebase console → *Messaging* → *New campaign* → *Send test message* → paste the token.
3. Add `url` = `https://…` as custom data to open it in the in-app WebView when tapped.
