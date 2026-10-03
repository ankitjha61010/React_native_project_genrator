import path from 'node:path';
import fs from 'fs-extra';
import plist from 'plist';
import xcode from 'xcode';
import type { SocialProviders, socialValues } from '../../config/socialAuth.js';
import { GeneratorError } from '../../utils/errors.js';
import { applyPatch, applyPatches, hasPatch } from '../../utils/nativePatch.js';

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
 * Podfile: the stock React Native template plus only what is genuinely needed –
 * react-native-permissions handlers, React Native Firebase resolved through CocoaPods
 * (not SPM, which would require dynamic frameworks), the Stripe iOS SDK likewise resolved
 * through CocoaPods when Stripe is the gateway, and a path-free `.xcode.env.local`.
 */
export async function configurePodfile(
  projectDir: string,
  appName: string,
  extraPermissions: string[] = [],
  googleSignIn = false,
  stripe = false,
): Promise<void> {
  const { podfile } = iosPaths(projectDir, appName);
  await edit(podfile, 'ios/Podfile', source => {
    // react-native-zip-archive (OTA) declares iOS 15.5, above React Native's minimum.
    source = source.replace(/^platform :ios, min_ios_version_supported$/m, "platform :ios, '15.5'");

    return applyPatches(
      source,
      [
        {
          id: 'node-require',
          anchor: /^platform :ios, (?:min_ios_version_supported|'15.5')$/m,
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
            '# when that file is missing - which breaks the build after every Node upgrade',
            '# (".../bin/node: No such file or directory", error 65). Keep a path-free file instead;',
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
            '# React Native Firebase config',
            '$RNFirebaseDisableSPM = true',
            ...(stripe
              ? [
                  '',
                  '# stripe-react-native: the Stripe iOS SDK through CocoaPods. Its Swift package needs',
                  '# dynamic frameworks, which break the static Firebase / prebuilt React Native setup.',
                  '$StripeDisableSPM = true',
                ]
              : []),
          ].join('\n'),
        },
        {
          // Swift pods built as static libraries can only import dependencies that define
          // modules: Firebase (FirebaseCoreInternal, …) imports GoogleUtilities, and Google
          // Sign-In's AppCheckCore imports RecaptchaInterop.
          id: 'firebase-modular-headers',
          anchor: /config = use_native_modules!/m,
          position: 'after',
          comment: '#',
          content: [
            "pod 'GoogleUtilities', :modular_headers => true",
            ...(googleSignIn ? ["pod 'RecaptchaInterop', :modular_headers => true"] : []),
          ].join('\n'),
        },
        {
          // Many pods – and their privacy resource bundles (`GoogleUtilities-GoogleUtilities_Privacy`, …) –
          // still declare iOS 9 / 11 / 12. Current Xcode refuses targets below its minimum (error 65), so every
          // pod target is raised to the app's own `platform :ios` version (read here, never hard-coded); pods
          // that require more keep their value.
          id: 'pods-deployment-target',
          anchor: /react_native_post_install\([\s\S]*?\n\s*\)/m,
          position: 'after',
          comment: '#',
          content: [
            'app_min_ios = installer.aggregate_targets.map { |t| t.platform.deployment_target }.compact.max',
            'if app_min_ios',
            '  pod_projects = installer.respond_to?(:generated_projects) ? installer.generated_projects : [installer.pods_project]',
            '  pod_projects.each do |project|',
            '    project.targets.each do |target|',
            '      target.build_configurations.each do |build_config|',
            "        current = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']",
            '        if current.nil? || Gem::Version.new(current) < Gem::Version.new(app_min_ios.to_s)',
            "          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = app_min_ios.to_s",
            '        end',
            '      end',
            '    end',
            '  end',
            'end',
          ].join('\n'),
        },
      ],
      'ios/Podfile',
    );
  });
}

/** Info.plist: one window scene, created by `SceneDelegate` (in AppDelegate.swift). */
const SCENE_MANIFEST = {
  UIApplicationSupportsMultipleScenes: false,
  UISceneConfigurations: {
    UIWindowSceneSessionRoleApplication: [
      { UISceneConfigurationName: 'Default Configuration', UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate' },
    ],
  },
};

/** React Native template: AppDelegate creates the window itself and starts React Native in it. */
const APP_WINDOW_START =
  /\n([ \t]*)window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*\n?[ \t]*factory\.startReactNative\(\s*withModuleName: "([^"]+)",\s*in: window,\s*launchOptions: launchOptions\s*\)\n/;

function sceneDelegateSource(moduleName: string): string {
  return `
// rn-architecture-generator: scene-delegate
/**
 * The UIScene lifecycle – apps built with the iOS 27 SDK are terminated at launch without it
 * (_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption). The window and React Native start here;
 * URLs and universal links arrive here instead of AppDelegate and are forwarded to it / React Native.
 */
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else { return }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    // Libraries that still read the window from the app delegate keep working.
    appDelegate.window = window

    // A link that cold-started the app: React Native's Linking.getInitialURL() reads it from the launch options.
    var launchOptions = appDelegate.launchOptions ?? [:]
    if let url = connectionOptions.urlContexts.first?.url {
      launchOptions[.url] = url
    }

    factory.startReactNative(
      withModuleName: "${moduleName}",
      in: window,
      launchOptions: launchOptions
    )
  }

  // Deep links / OAuth redirects while the app runs: AppDelegate's handler (e.g. Facebook Login) first, then React Native.
  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    let app = UIApplication.shared
    for context in URLContexts {
      var options: [UIApplication.OpenURLOptionsKey: Any] = [:]
      if let source = context.options.sourceApplication { options[.sourceApplication] = source }
      if let annotation = context.options.annotation { options[.annotation] = annotation }
      if app.delegate?.application?(app, open: context.url, options: options) == true { continue }
      RCTLinkingManager.application(app, open: context.url, options: options)
    }
  }

  // Universal links.
  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    RCTLinkingManager.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }
}
`;
}

/**
 * Adopts the UIScene lifecycle (required from the iOS 27 SDK): Info.plist gets a scene manifest, AppDelegate keeps
 * the React Native factory and launch options, and a `SceneDelegate` (appended to AppDelegate.swift, so no Xcode
 * project change) creates the window and starts React Native. Idempotent.
 */
export async function configureIosSceneLifecycle(projectDir: string, appName: string): Promise<void> {
  const { infoPlist, appDelegate } = iosPaths(projectDir, appName);

  if (!(await fs.pathExists(infoPlist))) {
    throw new GeneratorError(`Expected Info.plist at ${infoPlist}.`);
  }
  const data = plist.parse(await fs.readFile(infoPlist, 'utf8')) as Record<string, plist.PlistValue>;
  if (!data.UIApplicationSceneManifest) {
    data.UIApplicationSceneManifest = SCENE_MANIFEST;
    await fs.writeFile(infoPlist, plist.build(data, { indent: '\t', pretty: true }) + '\n', 'utf8');
  }

  await edit(appDelegate, 'AppDelegate.swift', source => {
    if (hasPatch(source, { id: 'scene-delegate' })) return source;
    const start = APP_WINDOW_START.exec(source);
    if (!start) {
      throw new GeneratorError('Could not configure AppDelegate.swift (scene-lifecycle).', {
        reason: `Expected to find ${APP_WINDOW_START} – the React Native template may have changed.`,
        tryHints: ['Please report this issue; the generated project was rolled back.'],
      });
    }
    const [, indent, moduleName] = start;
    source = source.replace(
      APP_WINDOW_START,
      `\n${indent}// rn-architecture-generator: scene-lifecycle\n` +
        `${indent}// The window is created by SceneDelegate (UIScene lifecycle, required from iOS 27).\n` +
        `${indent}self.launchOptions = launchOptions\n`,
    );
    source = applyPatch(
      source,
      {
        id: 'scene-launch-options',
        anchor: /^[ \t]*var reactNativeFactory: RCTReactNativeFactory\?$/m,
        position: 'after',
        comment: '//',
        content: 'var launchOptions: [UIApplication.LaunchOptionsKey: Any]?',
      },
      'AppDelegate.swift',
    );
    return `${source.replace(/\s*$/, '')}\n${sceneDelegateSource(moduleName!)}`;
  });
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
