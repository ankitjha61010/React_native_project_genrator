# Social login setup

This app ships with working social login code for:

{{#if SOCIAL_GOOGLE}}
- **Google Sign-In** – `@react-native-google-signin/google-signin`
{{/if}}
{{#if SOCIAL_FACEBOOK}}
- **Facebook Login** – `react-native-fbsdk-next`
{{/if}}
{{#if SOCIAL_APPLE}}
- **Sign in with Apple** – `@invertase/react-native-apple-authentication` (iOS 13+ only; the button is hidden on Android)
{{/if}}

All native setup (URL schemes, manifest entries, AppDelegate hooks{{#if SOCIAL_APPLE}}, entitlements{{/if}}) is already done.

**Status:** {{SOCIAL_STATUS_TEXT}}

Providers you skipped while generating still have placeholder keys (`YOUR_…`) – replace them with your own
values (the checklist below lists every place). Until you do, tapping that button shows a "not configured"
message; the app does not crash. Also add the same client ids / app id to the backend (`GOOGLE_CLIENT_IDS`,
`FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET`, `APPLE_CLIENT_IDS` in the backend's `.env`) – it verifies every sign-in.

---

## 1. Keys to replace (checklist)

| Provider | Key | Where to put it |
| --- | --- | --- |
{{#if SOCIAL_GOOGLE}}
| Google | Web client ID | `.env` → `GOOGLE_WEB_CLIENT_ID` |
| Google | iOS client ID | `.env` → `GOOGLE_IOS_CLIENT_ID` |
| Google | Reversed iOS client ID | `ios/{{APP_NAME}}/Info.plist` → `CFBundleURLTypes` → replace `com.googleusercontent.apps.YOUR_GOOGLE_IOS_CLIENT_ID` |
| Google | Android SHA-1 fingerprint | Google Cloud Console (nothing to change in the code) |
{{/if}}
{{#if SOCIAL_FACEBOOK}}
| Facebook | App ID | `android/app/src/main/res/values/strings.xml` → `facebook_app_id` **and** `fb_login_protocol_scheme` (`fb` + app ID) |
| Facebook | App ID | `ios/{{APP_NAME}}/Info.plist` → `FacebookAppID` **and** `CFBundleURLTypes` → `fbYOUR_FACEBOOK_APP_ID` → `fb<APP_ID>` |
| Facebook | Client token | `strings.xml` → `facebook_client_token` and `Info.plist` → `FacebookClientToken` |
| Facebook | Android key hash | Meta for Developers console (nothing to change in the code) |
{{/if}}
{{#if SOCIAL_APPLE}}
| Apple | "Sign in with Apple" capability | Apple Developer portal, for bundle id `{{PACKAGE_NAME}}` (the entitlement is already in `ios/{{APP_NAME}}/{{APP_NAME}}.entitlements`) |
{{/if}}

After changing `.env`, restart Metro with `npm start -- --reset-cache`.
After changing any native file, rebuild the app (`npm run android` / `npm run ios`).
If you added keys to `Info.plist` or `strings.xml`, you do **not** need to run `pod install` again.

{{#if SOCIAL_GOOGLE}}
---

## 2. Google Sign-In

1. Open [Google Cloud Console](https://console.cloud.google.com/) → select or create a project.
2. **APIs & Services → OAuth consent screen**: configure it (app name, support email, scopes `email` and `profile`).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**, three times:

   | Type | Settings | Used for |
   | --- | --- | --- |
   | **Web application** | no settings needed | `GOOGLE_WEB_CLIENT_ID` – Google returns an ID token for this audience, which your backend verifies |
   | **iOS** | Bundle ID: `{{PACKAGE_NAME}}` | `GOOGLE_IOS_CLIENT_ID` + the reversed URL scheme |
   | **Android** | Package name: `{{PACKAGE_NAME}}`, SHA-1 (see below) | Nothing in the code. Google matches the package name and SHA-1 of the installed app |

4. Put the IDs into `.env`:

   ```env
   GOOGLE_WEB_CLIENT_ID=1234567890-abc.apps.googleusercontent.com
   GOOGLE_IOS_CLIENT_ID=1234567890-xyz.apps.googleusercontent.com
   ```

5. **iOS URL scheme.** In `ios/{{APP_NAME}}/Info.plist`, replace `com.googleusercontent.apps.YOUR_GOOGLE_IOS_CLIENT_ID` with your
   *reversed* iOS client ID. For iOS client `1234567890-xyz.apps.googleusercontent.com` the scheme is
   `com.googleusercontent.apps.1234567890-xyz`.

6. **Android SHA-1.** Add the SHA-1 of *every* key that signs the app to the Android OAuth client:

   ```sh
   # Debug key (used by `npm run android`)
   cd android && ./gradlew signingReport
   # Release: use your upload keystore, and also the "App signing key" SHA-1
   # from Play Console → Setup → App integrity when you publish through Google Play.
   ```

   If this is wrong, sign-in fails with `DEVELOPER_ERROR` (code 10).

> Using Firebase Authentication? You can take the same client IDs from Firebase
> (Authentication → Sign-in method → Google). The web client ID is listed there under "Web SDK configuration".
{{/if}}

{{#if SOCIAL_FACEBOOK}}
---

## 3. Facebook Login

1. Open [Meta for Developers](https://developers.facebook.com/apps) → **Create app** → use case *Authenticate and request data from users with Facebook Login*.
2. **App settings → Basic**: copy the **App ID**. Under **App settings → Advanced → Security**, copy the **Client token**.
3. **Add platforms** (App settings → Basic → *Add platform*):
   - **iOS**: Bundle ID `{{PACKAGE_NAME}}`.
   - **Android**: Package name `{{PACKAGE_NAME}}`, class name `{{PACKAGE_NAME}}.MainActivity`, and your **key hashes**:

     ```sh
     # Debug key hash
     keytool -exportcert -alias androiddebugkey -keystore android/app/debug.keystore -storepass android | openssl sha1 -binary | openssl base64
     ```

4. **Android**: edit `android/app/src/main/res/values/strings.xml`:

   ```xml
   <string name="facebook_app_id">1234567890</string>
   <string name="facebook_client_token">abcdef0123456789</string>
   <string name="fb_login_protocol_scheme">fb1234567890</string>
   ```

5. **iOS**: edit `ios/{{APP_NAME}}/Info.plist`:
   - `FacebookAppID` → `1234567890`
   - `FacebookClientToken` → your client token
   - `CFBundleURLTypes` → replace `fbYOUR_FACEBOOK_APP_ID` with `fb1234567890`

6. While the Meta app is in **Development** mode, only people with a role on the app (admins, developers, testers) can log in.
   Switch it to **Live** before release.

**iOS Limited Login:** if the user does not allow App Tracking Transparency, Facebook does a *Limited Login*.
The service then returns `tokenType: 'authenticationToken'` (an OpenID Connect JWT) instead of a Graph API access token.
Your backend must accept both. See `socialAuthService.ts`.
{{/if}}

{{#if SOCIAL_APPLE}}
---

## 4. Sign in with Apple

1. [Apple Developer → Identifiers](https://developer.apple.com/account/resources/identifiers/list) → select the App ID
   `{{PACKAGE_NAME}}` (create it if needed) → enable **Sign in with Apple** → Save.
2. In Xcode, open `ios/{{APP_NAME}}.xcworkspace` → target **{{APP_NAME}}** → *Signing & Capabilities*.
   Select your team. **Sign in with Apple** is already listed because the entitlement is wired in.
   If it isn't, click *+ Capability* and add it.
3. Test on a **real device or a simulator signed in to an Apple ID** (Settings → Sign in to your iPhone).

Notes:
- Apple sends the user's **name and email only the first time** they sign in to your app. Store them on your backend.
  To test the first sign-in again: iPhone Settings → Apple ID → Sign-In & Security → Sign in with Apple → your app → *Stop using Apple ID*.
- The button is hidden on Android. (Apple sign-in on Android needs a web Services ID and a redirect URL.
  See the library docs if you need it.)
- **App Store rule 4.8:** an iOS app that offers Google or Facebook login must also offer Sign in with Apple.
{{/if}}

---

## 5. How the code fits together

| File | Responsibility |
| --- | --- |
| `{{PATH_AUTH_SOCIALAUTH}}` | Talks to the native SDKs and returns a `SocialAuthResult` (`provider`, `token`, `tokenType`, `user`) |
| `{{PATH_AUTH_SERVICE}}` | `{{SYMBOL:auth.service}}.socialLogin(result)` – **TODO:** send the token to your backend (currently a demo that trusts the result) |
| `{{PATH_AUTH_FORM}}` | The social buttons, loading state and error messages |
| `{{PATH_HOOKS_USEAUTHSESSION}}` | `signOut()` also signs out of the provider SDKs |

**Your backend must verify the token.** Never trust a token or profile the app sends without checking it:

| Provider | `tokenType` | Verify with |
| --- | --- | --- |
{{#if SOCIAL_GOOGLE}}
| Google | `idToken` | Google's public keys (`https://www.googleapis.com/oauth2/v3/certs`); `aud` must be your **web** client ID |
{{/if}}
{{#if SOCIAL_FACEBOOK}}
| Facebook | `accessToken` | `GET https://graph.facebook.com/debug_token?input_token=…&access_token=APP_ID|APP_SECRET` |
| Facebook | `authenticationToken` | Facebook's OIDC keys (`https://limited.facebook.com/.well-known/oauth/openid/jwks/`) |
{{/if}}
{{#if SOCIAL_APPLE}}
| Apple | `identityToken` | Apple's public keys (`https://appleid.apple.com/auth/keys`); `aud` must be `{{PACKAGE_NAME}}`, check `nonce` |
{{/if}}

---

## 6. Troubleshooting

| Problem | Fix |
| --- | --- |
| "…login is not configured" message | A `YOUR_…` placeholder is still in `.env`. Replace it, then restart Metro with `--reset-cache` |
{{#if SOCIAL_GOOGLE}}
| Google `DEVELOPER_ERROR` (Android) | SHA-1 or package name in the Android OAuth client doesn't match the installed build |
| Google: "no ID token" | `GOOGLE_WEB_CLIENT_ID` is not a **Web application** client ID |
| iOS error about a missing URL scheme | The reversed iOS client ID in `Info.plist` doesn't match `GOOGLE_IOS_CLIENT_ID` |
{{/if}}
{{#if SOCIAL_FACEBOOK}}
| Facebook "Invalid key hash" (Android) | Add the key hash shown in the error to the Meta app's Android platform |
| Facebook "App not active" / "Feature unavailable" | The Meta app is in Development mode and the account has no role on it |
{{/if}}
{{#if SOCIAL_APPLE}}
| Apple error 1000 | The Sign in with Apple capability is missing in Xcode or not enabled for the App ID |
{{/if}}
