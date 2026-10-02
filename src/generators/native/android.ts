import path from 'node:path';
import fs from 'fs-extra';
import type { ReactNativeProfile } from '../../config/reactNativeVersions.js';
import type { SocialProviders, socialValues } from '../../config/socialAuth.js';
import { GeneratorError } from '../../utils/errors.js';
import { appendBlock, applyPatches } from '../../utils/nativePatch.js';

async function edit(file: string, label: string, transform: (source: string) => string): Promise<void> {
  if (!(await fs.pathExists(file))) {
    throw new GeneratorError(`Expected ${label} at ${file} – was the React Native project created?`);
  }
  const source = await fs.readFile(file, 'utf8');
  const next = transform(source);
  if (next !== source) {
    await fs.writeFile(file, next, 'utf8');
  }
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, "\\'");
}

/** Google Services Gradle plugin – applied only when google-services.json exists. */
export async function configureAndroidFirebase(projectDir: string, profile: ReactNativeProfile): Promise<void> {
  const android = path.join(projectDir, 'android');

  await edit(path.join(android, 'build.gradle'), 'android/build.gradle', source =>
    applyPatches(
      source,
      [
        {
          id: 'google-services-classpath',
          anchor: /classpath\("com\.facebook\.react:react-native-gradle-plugin"\)/,
          position: 'after',
          comment: '//',
          content: `classpath("com.google.gms:google-services:${profile.native.googleServicesPlugin}")`,
        },
      ],
      'android/build.gradle',
    ),
  );

  await edit(path.join(android, 'app', 'build.gradle'), 'android/app/build.gradle', source => {
    if (!/apply plugin: "com\.facebook\.react"/.test(source)) {
      throw new GeneratorError('Could not configure android/app/build.gradle (unexpected template).');
    }
    return appendBlock(source, {
      id: 'google-services-plugin',
      comment: '//',
      content: [
        '// Firebase is enabled as soon as android/app/google-services.json exists (see firebase/README.md).',
        'if (file("google-services.json").exists()) {',
        '    apply plugin: "com.google.gms.google-services"',
        '} else {',
        '    logger.warn("google-services.json not found – Firebase is disabled. See firebase/README.md")',
        '}',
      ].join('\n'),
    });
  });
}

/** Runtime permissions used by notifications and the image picker. */
export async function configureAndroidPermissions(projectDir: string): Promise<void> {
  const manifest = path.join(projectDir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  await edit(manifest, 'AndroidManifest.xml', source =>
    applyPatches(
      source,
      [
        {
          id: 'permissions',
          anchor: /<uses-permission android:name="android\.permission\.INTERNET" \/>/,
          position: 'after',
          comment: 'xml',
          content: [
            '<!-- Android 13+ notification permission (requested at runtime) -->',
            '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
            '<!-- Camera for react-native-image-picker (requested at runtime) -->',
            '<uses-permission android:name="android.permission.CAMERA" />',
            '<uses-feature android:name="android.hardware.camera" android:required="false" />',
            '<uses-feature android:name="android.hardware.camera.front" android:required="false" />',
          ].join('\n'),
        },
      ],
      'AndroidManifest.xml',
    ),
  );
}

/** RECORD_AUDIO for chat voice messages (requested at runtime). */
export async function configureAndroidMicrophone(projectDir: string): Promise<void> {
  const manifest = path.join(projectDir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  await edit(manifest, 'AndroidManifest.xml', source =>
    applyPatches(
      source,
      [
        {
          id: 'microphone',
          anchor: /<uses-permission android:name="android\.permission\.INTERNET" \/>/,
          position: 'after',
          comment: 'xml',
          content: ['<!-- Microphone for chat voice messages (requested at runtime) -->', '<uses-permission android:name="android.permission.RECORD_AUDIO" />'].join('\n'),
        },
      ],
      'AndroidManifest.xml',
    ),
  );
}

/** Location permissions for the Google Location SDK (requested at runtime) – only when it was selected. */
export async function configureAndroidLocation(projectDir: string): Promise<void> {
  const manifest = path.join(projectDir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  await edit(manifest, 'AndroidManifest.xml', source =>
    applyPatches(
      source,
      [
        {
          id: 'location',
          anchor: /<uses-permission android:name="android\.permission\.INTERNET" \/>/,
          position: 'after',
          comment: 'xml',
          content: [
            '<!-- Google Location SDK: precise + approximate location (requested at runtime) -->',
            '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
            '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
          ].join('\n'),
        },
      ],
      'AndroidManifest.xml',
    ),
  );
}

/**
 * Android only mirrors the UI when the app declares `supportsRtl`. Set it ONLY for apps
 * generated with RTL support: an LTR-only app must stay left-to-right even on an Arabic
 * device (otherwise stack headers show a mirrored back arrow).
 */
export async function configureAndroidLayoutDirection(projectDir: string, rtl: boolean): Promise<void> {
  const manifest = path.join(projectDir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  await edit(manifest, 'AndroidManifest.xml', source => {
    const withoutFlag = source.replace(/\n?\s*android:supportsRtl="(true|false)"/, '');
    return withoutFlag.replace(/<application\b/, `<application\n      android:supportsRtl="${rtl}"`);
  });
}

/**
 * Android 9+ blocks cleartext HTTP by default. Development machines run HTTP APIs (and serve
 * uploaded photos/media) at http://10.0.2.2:3000 or local network IPs, so usesCleartextTraffic
 * is required for images and API calls to work on Android devices & emulators.
 */
export async function configureAndroidCleartextTraffic(projectDir: string): Promise<void> {
  const manifest = path.join(projectDir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  await edit(manifest, 'AndroidManifest.xml', source => {
    if (source.includes('android:usesCleartextTraffic')) return source;
    return source.replace(/<application\b/, '<application\n      android:usesCleartextTraffic="true"');
  });
}

/**
 * react-native-screens cannot restore its screens when Android re-creates MainActivity from saved state (the app
 * was killed in the background and is reopened – e.g. by answering a call): the app crashes on start. Its fragment
 * factory handles the restore (react-native-screens README).
 */
export async function configureAndroidScreensRestoration(projectDir: string, packageName: string): Promise<void> {
  const packagePath = packageName.replace(/\./g, '/');
  const main = path.join(projectDir, 'android', 'app', 'src', 'main');
  const kotlin = path.join(main, 'kotlin', packagePath, 'MainActivity.kt');
  const file = (await fs.pathExists(kotlin)) ? kotlin : path.join(main, 'java', packagePath, 'MainActivity.kt');
  await edit(file, 'MainActivity.kt', source => {
    if (source.includes('RNScreensFragmentFactory')) return source;
    let next = source.replace(
      /(package\s+[^\n]+\n)/,
      `$1\nimport android.os.Bundle\nimport com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory\n`,
    );
    next = next.replace(/\nimport android\.os\.Bundle\n([\s\S]*)\nimport android\.os\.Bundle\n/, '\nimport android.os.Bundle\n$1\n');
    return next.replace(
      /class\s+MainActivity[^{]*\{/,
      `$&\n\n  // react-native-screens: restores its screens when Android re-creates this activity.\n  override fun onCreate(savedInstanceState: Bundle?) {\n    supportFragmentManager.fragmentFactory = RNScreensFragmentFactory()\n    super.onCreate(savedInstanceState)\n  }`,
    );
  });
}

export async function setAndroidDisplayName(projectDir: string, displayName: string): Promise<void> {
  const strings = path.join(projectDir, 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml');
  await edit(strings, 'strings.xml', source => {
    const pattern = /(<string name="app_name">)[^<]*(<\/string>)/;
    if (!pattern.test(source)) {
      throw new GeneratorError('Could not set the Android app name (strings.xml has no app_name).');
    }
    return source.replace(pattern, `$1${escapeXml(displayName)}$2`);
  });
}

export async function installGoogleServicesJson(projectDir: string, sourceFile: string): Promise<void> {
  await fs.copy(sourceFile, path.join(projectDir, 'android', 'app', 'google-services.json'));
}

/** Android loads custom fonts from `assets/fonts` by file name (`fontFamily: 'GolosText-Bold'`). */
export async function installAndroidFonts(projectDir: string, fontPaths: string[]): Promise<void> {
  const target = path.join(projectDir, 'android', 'app', 'src', 'main', 'assets', 'fonts');
  for (const font of fontPaths) {
    await fs.copy(path.join(projectDir, font), path.join(target, path.basename(font)));
  }
}

/**
 * Facebook Login on Android: app id / client token string resources, the SDK meta-data,
 * the Custom Tab redirect activity and package visibility for the Facebook app.
 * Google Sign-In needs no manifest changes (only the SHA-1 in Google Cloud – see
 * docs/SOCIAL_LOGIN.md). Sign in with Apple is iOS only.
 */
export async function configureAndroidSocialAuth(projectDir: string, providers: SocialProviders, values: ReturnType<typeof socialValues>): Promise<void> {
  if (!providers.facebook) return;
  const main = path.join(projectDir, 'android', 'app', 'src', 'main');

  await edit(path.join(main, 'res', 'values', 'strings.xml'), 'strings.xml', source =>
    applyPatches(
      source,
      [
        {
          id: 'facebook-strings',
          anchor: /^<\/resources>/m,
          position: 'before',
          comment: 'xml',
          content: [
            '    <!-- Facebook Login (YOUR_… = not configured yet, see docs/SOCIAL_LOGIN.md) -->',
            `    <string name="facebook_app_id">${escapeXml(values.facebookAppId)}</string>`,
            `    <string name="facebook_client_token">${escapeXml(values.facebookClientToken)}</string>`,
            '    <!-- "fb" followed by your app id, e.g. fb1234567890 -->',
            `    <string name="fb_login_protocol_scheme">fb${escapeXml(values.facebookAppId)}</string>`,
          ].join('\n'),
        },
      ],
      'strings.xml',
    ),
  );

  await edit(path.join(main, 'AndroidManifest.xml'), 'AndroidManifest.xml', source =>
    applyPatches(
      source,
      [
        {
          id: 'facebook-application',
          anchor: /^[ \t]*<\/application>/m,
          position: 'before',
          comment: 'xml',
          content: [
            '  <!-- Facebook SDK (values live in res/values/strings.xml) -->',
            '  <meta-data android:name="com.facebook.sdk.ApplicationId" android:value="@string/facebook_app_id" />',
            '  <meta-data android:name="com.facebook.sdk.ClientToken" android:value="@string/facebook_client_token" />',
            '  <!-- Browser (Custom Tab) login redirects back to the app through this activity -->',
            '  <activity android:name="com.facebook.CustomTabActivity" android:exported="true">',
            '    <intent-filter>',
            '      <action android:name="android.intent.action.VIEW" />',
            '      <category android:name="android.intent.category.DEFAULT" />',
            '      <category android:name="android.intent.category.BROWSABLE" />',
            '      <data android:scheme="@string/fb_login_protocol_scheme" />',
            '    </intent-filter>',
            '  </activity>',
          ].join('\n'),
        },
        {
          id: 'facebook-queries',
          anchor: /^<\/manifest>/m,
          position: 'before',
          comment: 'xml',
          content: [
            '    <!-- Android 11+ package visibility: lets the SDK log in through the Facebook app -->',
            '    <queries>',
            '        <provider android:authorities="com.facebook.katana.provider.PlatformProvider" />',
            '    </queries>',
          ].join('\n'),
        },
      ],
      'AndroidManifest.xml',
    ),
  );
}
