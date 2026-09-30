import path from 'node:path';
import fs from 'fs-extra';
import plist from 'plist';
import xcode from 'xcode';
import type { SocialProviders, socialValues } from '../../config/socialAuth.js';
import { GeneratorError } from '../../utils/errors.js';
import { applyPatches } from '../../utils/nativePatch.js';

function iosPaths(projectDir: string, appName: string) {
  const ios = path.join(projectDir, 'ios');
  return {
    ios,
    podfile: path.join(ios, 'Podfile'),
    xcodeEnv: path.join(ios, '.xcode.env'),
    appDelegate: path.join(ios, appName, 'AppDelegate.swift'),
    infoPlist: path.join(ios, appName, 'Info.plist'),
    pbxproj: path.join(ios, `${appName}.xcodeproj`, 'project.pbxproj'),
    appFolder: path.join(ios, appName),
  };
}

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

/**
 * Versioned `ios/.xcode.env`, sourced by every Xcode script phase. Xcode doesn't load
 * the shell profile, so `node` from nvm/fnm/Volta/Homebrew is resolved here instead of
 * hard-coding a path that breaks on the next Node upgrade.
 */
export const XCODE_ENV = `# This \`.xcode.env\` file is versioned and is sourced by every Xcode script phase
# (bundling JS, Hermes, codegen…). Machine specific overrides go into
# \`.xcode.env.local\` (git-ignored).
#
# Xcode does not load your shell profile, so node installed through nvm, fnm, Volta,
# asdf or Homebrew is usually not on its PATH. It is resolved here dynamically –
# never hard-code an absolute node path, it breaks as soon as Node is upgraded.

export PATH="$HOME/.volta/bin:$HOME/.asdf/shims:/opt/homebrew/bin:/usr/local/bin:$PATH"

# nvm (uses your \`nvm alias default\`)
export NVM_DIR="\${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh" >/dev/null 2>&1 || true
fi

# fnm
if command -v fnm >/dev/null 2>&1; then
  eval "$(fnm env 2>/dev/null)" || true
fi

if command -v node >/dev/null 2>&1; then
  export NODE_BINARY="$(command -v node)"
fi
`;

export async function configureXcodeEnv(projectDir: string, appName: string): Promise<void> {
  const { ios, xcodeEnv } = iosPaths(projectDir, appName);
  if (!(await fs.pathExists(ios))) {
    throw new GeneratorError(`Expected the ios folder at ${ios} – was the React Native project created?`);
  }
  await fs.writeFile(xcodeEnv, XCODE_ENV, 'utf8');
  // Never ship a machine specific override.
  await fs.remove(path.join(ios, '.xcode.env.local'));
}

/**
 * Podfile: react-native-permissions handlers, static frameworks for React Native
 * Firebase (resolved through CocoaPods, not SPM) and a path-free `.xcode.env.local`.
 */
export async function configurePodfile(projectDir: string, appName: string, extraPermissions: string[] = []): Promise<void> {
  const { podfile } = iosPaths(projectDir, appName);
  await edit(podfile, 'ios/Podfile', source =>
    applyPatches(
      source,
      [
        {
          id: 'node-require',
          anchor: /^platform :ios, min_ios_version_supported$/m,
          position: 'before',
          comment: '#',
          content: [
            'def node_require(script)',
            '  # Resolve script with node to allow for hoisting',
            "  require Pod::Executable.execute_command('node', ['-p',",
            '    "require.resolve(',
            "      '#{script}',",
            '      {paths: [process.argv[1]]},',
            '    )", __dir__]).strip',
            'end',
            "node_require('react-native-permissions/scripts/setup.rb')",
            '',
          ].join('\n'),
        },
        {
          id: 'xcode-env-local',
          anchor: /^prepare_react_native_project!$/m,
          position: 'before',
          comment: '#',
          content: [
            '# `pod install` writes the absolute path of the current node into .xcode.env.local',
            '# when that file is missing – which breaks the build after every Node upgrade',
            '# ("…/bin/node: No such file or directory", error 65). Keep a path-free file instead;',
            '# NODE_BINARY is resolved dynamically in .xcode.env.',
            "xcode_env_local = File.join(__dir__, '.xcode.env.local')",
            'if !File.exist?(xcode_env_local) || File.read(xcode_env_local).strip.match?(/\\Aexport NODE_BINARY=[^$\\n]+\\z/)',
            '  File.write(xcode_env_local, "# Machine specific overrides (git-ignored), e.g.\\n# export NODE_BINARY=/path/to/node\\n")',
            'end',
            '',
          ].join('\n'),
        },
        {
          id: 'permissions-and-firebase',
          anchor: /^prepare_react_native_project!$/m,
          position: 'after',
          comment: '#',
          content: [
            '',
            '# react-native-permissions: only the handlers listed here are compiled in.',
            '# Add more (e.g. LocationWhenInUse) together with their Info.plist usage description.',
            `setup_permissions([${['Camera', 'Notifications', ...extraPermissions].map(p => `'${p}'`).join(', ')}])`,
            '',
            '# React Native Firebase requires static frameworks.',
            'use_frameworks! :linkage => :static',
            '$RNFirebaseAsStaticFramework = true',
            "# Firebase's SPM products can't be linked into static frameworks (duplicate symbols) –",
            '# resolve the Firebase SDK through CocoaPods instead.',
            '$RNFirebaseDisableSPM = true',
          ].join('\n'),
        },
        {
          id: 'min-ios-deployment-target',
          anchor: /react_native_post_install\([\s\S]*?\n\s*\)/m,
          position: 'after',
          comment: '#',
          content: [
            '',
            '    installer.pods_project.targets.each do |target|',
            '      target.build_configurations.each do |config|',
            "        if Gem::Version.new(config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] || '0') < Gem::Version.new(min_ios_version_supported)",
            "          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = min_ios_version_supported",
            '        end',
            '      end',
            '    end',
          ].join('\n'),
        },
      ],
      'ios/Podfile',
    ),
  );
}

/** AppDelegate: configure Firebase only when GoogleService-Info.plist is bundled. */
export async function configureAppDelegate(projectDir: string, appName: string): Promise<void> {
  const { appDelegate } = iosPaths(projectDir, appName);
  await edit(appDelegate, 'AppDelegate.swift', source =>
    applyPatches(
      source,
      [
        {
          id: 'firebase-import',
          anchor: /^import UIKit$/m,
          position: 'after',
          comment: '//',
          content: 'import FirebaseCore',
        },
        {
          id: 'firebase-configure',
          anchor: /didFinishLaunchingWithOptions launchOptions:[^\n]*\n\s*\) -> Bool \{/,
          position: 'after',
          comment: '//',
          content: [
            '// Firebase is configured only when GoogleService-Info.plist is part of the target (see firebase/README.md).',
            'if Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil {',
            '  FirebaseApp.configure()',
            '}',
            '',
          ].join('\n'),
        },
      ],
      'AppDelegate.swift',
    ),
  );
}

/** Info.plist: microphone usage description (chat voice messages). */
export async function configureIosMicrophone(projectDir: string, appName: string, displayName: string): Promise<void> {
  const { infoPlist } = iosPaths(projectDir, appName);
  if (!(await fs.pathExists(infoPlist))) {
    throw new GeneratorError(`Expected Info.plist at ${infoPlist}.`);
  }
  const data = plist.parse(await fs.readFile(infoPlist, 'utf8')) as Record<string, plist.PlistValue>;
  data.NSMicrophoneUsageDescription ??= `${displayName} uses the microphone to record voice messages.`;
  await fs.writeFile(infoPlist, plist.build(data, { indent: '\t', pretty: true }) + '\n', 'utf8');
}

/**
 * Info.plist: the location usage description exists only with the Google Location SDK. Without
 * it, the RN template's empty placeholder is removed (no unused permission text).
 */
export async function configureIosLocation(projectDir: string, appName: string, displayName: string, enabled: boolean): Promise<void> {
  const { infoPlist } = iosPaths(projectDir, appName);
  if (!(await fs.pathExists(infoPlist))) {
    throw new GeneratorError(`Expected Info.plist at ${infoPlist}.`);
  }
  const data = plist.parse(await fs.readFile(infoPlist, 'utf8')) as Record<string, plist.PlistValue>;
  if (enabled && !data.NSLocationWhenInUseUsageDescription) {
    data.NSLocationWhenInUseUsageDescription = `${displayName} uses your location to fill in where you are.`;
  } else if (!enabled) {
    delete data.NSLocationWhenInUseUsageDescription;
  }
  await fs.writeFile(infoPlist, plist.build(data, { indent: '\t', pretty: true }) + '\n', 'utf8');
}

/** Info.plist: display name, usage descriptions and remote-notification background mode. */
export async function configureInfoPlist(projectDir: string, appName: string, displayName: string): Promise<void> {
  const { infoPlist } = iosPaths(projectDir, appName);
  if (!(await fs.pathExists(infoPlist))) {
    throw new GeneratorError(`Expected Info.plist at ${infoPlist}.`);
  }
  const data = plist.parse(await fs.readFile(infoPlist, 'utf8')) as Record<string, plist.PlistValue>;

  data.CFBundleDisplayName = displayName;
  data.NSCameraUsageDescription ??= `${displayName} uses the camera to take photos.`;
  data.NSPhotoLibraryUsageDescription ??= `${displayName} needs access to your photos so you can choose an image.`;
  // The RN template ships an empty location description – remove it unless it's filled in.
  if (data.NSLocationWhenInUseUsageDescription === '') {
    delete data.NSLocationWhenInUseUsageDescription;
  }
  const modes = new Set(Array.isArray(data.UIBackgroundModes) ? (data.UIBackgroundModes as string[]) : []);
  modes.add('remote-notification');
  data.UIBackgroundModes = [...modes];

  await fs.writeFile(infoPlist, plist.build(data, { indent: '\t', pretty: true }) + '\n', 'utf8');
}

/**
 * `addResourceFile` of the xcode package requires a group named "Resources" (the RN
 * template has none). Creates it – without a path, so file paths stay relative to ios/.
 */
function ensureResourcesGroup(project: ReturnType<typeof xcode.project>): string {
  const existing = project.findPBXGroupKey({ name: 'Resources' });
  if (existing) {
    return existing;
  }
  const key = project.pbxCreateGroup('Resources');
  project.addToPbxGroup(key, project.getFirstProject().firstProject.mainGroup);
  return key;
}

/** Copies GoogleService-Info.plist and adds it to the app target's resources. */
export async function installGoogleServiceInfoPlist(projectDir: string, appName: string, sourceFile: string): Promise<void> {
  const { pbxproj, appFolder } = iosPaths(projectDir, appName);
  await fs.copy(sourceFile, path.join(appFolder, 'GoogleService-Info.plist'));

  const project = xcode.project(pbxproj);
  project.parseSync();
  const groupKey = project.findPBXGroupKey({ name: appName }) ?? project.findPBXGroupKey({ path: appName });
  if (!groupKey) {
    throw new GeneratorError(`Could not find the "${appName}" group in the Xcode project.`);
  }
  const alreadyAdded = Object.values(project.pbxFileReferenceSection()).some(
    ref => typeof ref === 'object' && ref !== null && String((ref as { path?: string }).path).includes('GoogleService-Info.plist'),
  );
  if (!alreadyAdded) {
    ensureResourcesGroup(project);
    project.addResourceFile(`${appName}/GoogleService-Info.plist`, { target: project.getFirstTarget().uuid }, groupKey);
    await fs.writeFile(pbxproj, project.writeSync(), 'utf8');
  }
}

/** Font file shipped by @react-native-vector-icons/material-design-icons (copied into the bundle by its pod). */
export const VECTOR_ICON_FONTS = ['MaterialDesignIcons.ttf'];

/**
 * Custom fonts on iOS: every font file is a resource of the app target (referenced from
 * its place in `src/`, not copied) and listed in Info.plist › UIAppFonts. Icon fonts are
 * bundled by their pod but still have to be listed in UIAppFonts, otherwise icons render
 * as "?" boxes.
 */
export async function linkIosFonts(
  projectDir: string,
  appName: string,
  fontPaths: string[],
  extraAppFonts: string[] = [],
): Promise<void> {
  const { pbxproj, infoPlist } = iosPaths(projectDir, appName);

  const project = xcode.project(pbxproj);
  project.parseSync();
  const groupKey = ensureResourcesGroup(project);
  const existing = Object.values(project.pbxFileReferenceSection())
    .filter((ref): ref is { path?: string } => typeof ref === 'object' && ref !== null)
    .map(ref => String(ref.path ?? '').replace(/"/g, ''));
  let changed = false;
  for (const font of fontPaths) {
    // The Resources group has no path, so references are relative to ios/.
    const reference = path.posix.join('..', font);
    if (!existing.includes(reference)) {
      project.addResourceFile(reference, { target: project.getFirstTarget().uuid }, groupKey);
      changed = true;
    }
  }
  if (changed) {
    // The xcode package doesn't know .ttf: give the references a proper type instead of
    // "unknown" and drop the attributes it writes as the literal `undefined`.
    for (const ref of Object.values(project.pbxFileReferenceSection())) {
      if (typeof ref !== 'object' || ref === null) continue;
      const fileRef = ref as Record<string, unknown>;
      if (!/\.(ttf|otf)"?$/.test(String(fileRef.path ?? ''))) continue;
      fileRef.lastKnownFileType = 'file';
      for (const key of Object.keys(fileRef)) {
        if (fileRef[key] === undefined || fileRef[key] === 'undefined') delete fileRef[key];
      }
    }
    await fs.writeFile(pbxproj, project.writeSync(), 'utf8');
  }

  if (!(await fs.pathExists(infoPlist))) {
    throw new GeneratorError(`Expected Info.plist at ${infoPlist}.`);
  }
  const data = plist.parse(await fs.readFile(infoPlist, 'utf8')) as Record<string, plist.PlistValue>;
  const fonts = new Set(Array.isArray(data.UIAppFonts) ? (data.UIAppFonts as string[]) : []);
  [...fontPaths.map(font => path.posix.basename(font)), ...extraAppFonts].forEach(font => fonts.add(font));
  data.UIAppFonts = [...fonts];
  await fs.writeFile(infoPlist, plist.build(data, { indent: '\t', pretty: true }) + '\n', 'utf8');
}

/** Adds a URL scheme to Info.plist › CFBundleURLTypes (idempotent). */
function addUrlScheme(data: Record<string, plist.PlistValue>, scheme: string): void {
  const types = Array.isArray(data.CFBundleURLTypes) ? (data.CFBundleURLTypes as Array<Record<string, plist.PlistValue>>) : [];
  const exists = types.some(t => Array.isArray(t.CFBundleURLSchemes) && (t.CFBundleURLSchemes as string[]).includes(scheme));
  if (!exists) {
    types.push({ CFBundleURLSchemes: [scheme] });
  }
  data.CFBundleURLTypes = types;
}

/** Schemes the Facebook SDK queries to log in through the Facebook app. */
const FACEBOOK_QUERY_SCHEMES = ['fbapi', 'fb-messenger-api', 'fbauth2', 'fbshareextension'];

/**
 * Social login on iOS:
 * - Google: reversed iOS client id URL scheme.
 * - Facebook: FacebookAppID / ClientToken / DisplayName, `fb<APP_ID>` URL scheme, query
 *   schemes and the SDK hooks in AppDelegate (launch + open URL).
 * - Apple: "Sign in with Apple" entitlement wired into the app target.
 * Values are the credentials entered while generating, or YOUR_… placeholders (docs/SOCIAL_LOGIN.md).
 */
export async function configureIosSocialAuth(
  projectDir: string,
  appName: string,
  displayName: string,
  providers: SocialProviders,
  values: ReturnType<typeof socialValues>,
): Promise<void> {
  const { infoPlist, appDelegate, pbxproj, appFolder } = iosPaths(projectDir, appName);

  if (providers.google || providers.facebook) {
    if (!(await fs.pathExists(infoPlist))) {
      throw new GeneratorError(`Expected Info.plist at ${infoPlist}.`);
    }
    const data = plist.parse(await fs.readFile(infoPlist, 'utf8')) as Record<string, plist.PlistValue>;
    if (providers.google) {
      addUrlScheme(data, values.googleIosUrlScheme);
    }
    if (providers.facebook) {
      data.FacebookAppID = values.facebookAppId;
      data.FacebookClientToken = values.facebookClientToken;
      data.FacebookDisplayName ??= displayName;
      addUrlScheme(data, `fb${values.facebookAppId}`);
      const queries = new Set(Array.isArray(data.LSApplicationQueriesSchemes) ? (data.LSApplicationQueriesSchemes as string[]) : []);
      FACEBOOK_QUERY_SCHEMES.forEach(s => queries.add(s));
      data.LSApplicationQueriesSchemes = [...queries];
    }
    await fs.writeFile(infoPlist, plist.build(data, { indent: '\t', pretty: true }) + '\n', 'utf8');
  }

  if (providers.facebook) {
    await edit(appDelegate, 'AppDelegate.swift', source =>
      applyPatches(
        source,
        [
          {
            id: 'facebook-import',
            anchor: /^import UIKit$/m,
            position: 'after',
            comment: '//',
            content: 'import FBSDKCoreKit',
          },
          {
            id: 'facebook-launch',
            anchor: /didFinishLaunchingWithOptions launchOptions:[^\n]*\n\s*\) -> Bool \{/,
            position: 'after',
            comment: '//',
            content: 'ApplicationDelegate.shared.application(application, didFinishLaunchingWithOptions: launchOptions)',
          },
          {
            id: 'facebook-open-url',
            // Last line of the AppDelegate class (the RN delegate class follows it).
            anchor: /^\}\n\nclass ReactNativeDelegate/m,
            position: 'before',
            comment: '//',
            content: [
              '  // Facebook Login returns to the app through a URL; other deep links go to React Native.',
              '  func application(',
              '    _ app: UIApplication,',
              '    open url: URL,',
              '    options: [UIApplication.OpenURLOptionsKey: Any] = [:]',
              '  ) -> Bool {',
              '    if ApplicationDelegate.shared.application(app, open: url, options: options) {',
              '      return true',
              '    }',
              '    return RCTLinkingManager.application(app, open: url, options: options)',
              '  }',
            ].join('\n'),
          },
        ],
        'AppDelegate.swift',
      ),
    );
  }

  if (providers.apple) {
    const entitlementsName = `${appName}.entitlements`;
    const entitlementsFile = path.join(appFolder, entitlementsName);
    const entitlements = (await fs.pathExists(entitlementsFile))
      ? (plist.parse(await fs.readFile(entitlementsFile, 'utf8')) as Record<string, plist.PlistValue>)
      : {};
    entitlements['com.apple.developer.applesignin'] = ['Default'];
    await fs.writeFile(entitlementsFile, plist.build(entitlements, { indent: '\t', pretty: true }) + '\n', 'utf8');

    // Point the app target (Debug + Release) at the entitlements file.
    const project = xcode.project(pbxproj);
    project.parseSync();
    let linked = false;
    for (const config of Object.values(project.pbxXCBuildConfigurationSection())) {
      if (typeof config !== 'object' || config === null) continue;
      const settings = (config as { buildSettings?: Record<string, unknown> }).buildSettings;
      if (!settings || String(settings.INFOPLIST_FILE ?? '').replace(/"/g, '') !== `${appName}/Info.plist`) continue;
      settings.CODE_SIGN_ENTITLEMENTS = `${appName}/${entitlementsName}`;
      linked = true;
    }
    if (!linked) {
      throw new GeneratorError(`Could not add the Sign in with Apple entitlement to the "${appName}" target.`);
    }
    await fs.writeFile(pbxproj, project.writeSync(), 'utf8');
  }
}
