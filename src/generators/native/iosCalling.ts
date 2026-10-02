import path from 'node:path';
import fs from 'fs-extra';
import plist from 'plist';
import { applyPatches } from '../../utils/nativePatch.js';

function iosPaths(projectDir: string, appName: string) {
  const ios = path.join(projectDir, 'ios');
  return {
    ios,
    podfile: path.join(ios, 'Podfile'),
    appDelegate: path.join(ios, appName, 'AppDelegate.swift'),
    infoPlist: path.join(ios, appName, 'Info.plist'),
  };
}

async function edit(file: string, transform: (source: string) => string): Promise<void> {
  if (!(await fs.pathExists(file))) return;
  const source = await fs.readFile(file, 'utf8');
  const next = transform(source);
  if (next !== source) await fs.writeFile(file, next, 'utf8');
}

/**
 * Info.plist:
 * - NSMicrophoneUsageDescription (audio + video calls)
 * - NSCameraUsageDescription (video calls)
 * - UIBackgroundModes: voip (required for PushKit VoIP wake) + audio
 */
export async function configureIosCalling(projectDir: string, appName: string, displayName: string, hasVideo: boolean): Promise<void> {
  const { infoPlist } = iosPaths(projectDir, appName);
  if (!(await fs.pathExists(infoPlist))) return;

  const data = plist.parse(await fs.readFile(infoPlist, 'utf8')) as Record<string, plist.PlistValue>;

  data.NSMicrophoneUsageDescription ??= `${displayName} uses the microphone for calls.`;
  if (hasVideo) {
    data.NSCameraUsageDescription ??= `${displayName} uses the camera for video calls.`;
  }

  // Background modes: 'voip' wakes the app for PushKit; 'audio' keeps Agora running.
  const modes = new Set(Array.isArray(data.UIBackgroundModes) ? (data.UIBackgroundModes as string[]) : []);
  modes.add('voip');
  modes.add('audio');
  data.UIBackgroundModes = [...modes];

  await fs.writeFile(infoPlist, plist.build(data, { indent: '\t', pretty: true }) + '\n', 'utf8');
}

/**
 * AppDelegate.swift: Register for VoIP notifications with PushKit.
 * react-native-voip-push-notification handles the actual registration;
 * we only need to ensure the background mode is configured.
 * CallKit (via react-native-callkeep) is auto-configured by the library.
 */
export async function configureIosCallingAppDelegate(projectDir: string, appName: string): Promise<void> {
  const { appDelegate } = iosPaths(projectDir, appName);
  await edit(appDelegate, source =>
    applyPatches(
      source,
      [
        {
          id: 'voip-import',
          anchor: /^import UIKit$/m,
          position: 'after',
          comment: '//',
          content: [
            '// react-native-voip-push-notification (PushKit – wakes app for incoming calls)',
            'import PushKit',
          ].join('\n'),
        },
      ],
      'AppDelegate.swift',
    ),
  );
}

/**
 * Podfile: react-native-agora imports `"RCTBridge.h"` without the `React/` prefix. With the
 * prebuilt React core (React Native's default) that header only exists inside
 * React.framework, so it is added to that one pod's header search paths. Without the
 * prebuilt core the path doesn't exist and is ignored.
 */
export async function configureIosCallingPodfile(projectDir: string, appName: string): Promise<void> {
  const { podfile } = iosPaths(projectDir, appName);
  await edit(podfile, source =>
    applyPatches(
      source,
      [
        {
          id: 'agora-react-headers',
          anchor: /react_native_post_install\([\s\S]*?\n\s*\)/m,
          position: 'after',
          comment: '#',
          content: [
            "agora = installer.pods_project.targets.find { |t| t.name == 'react-native-agora' }",
            'agora&.build_configurations&.each do |config|',
            "  config.build_settings['HEADER_SEARCH_PATHS'] = ['$(inherited)', '\"$(PODS_CONFIGURATION_BUILD_DIR)/XCFrameworkIntermediates/React-Core-prebuilt/React.framework/Headers\"']",
            'end',
          ].join('\n'),
        },
      ],
      'ios/Podfile',
    ),
  );
}

/**
 * Podfile: react-native-permissions – add Microphone permission handler.
 * Camera is added by configureIosCalling separately if video is enabled.
 * The actual setup_permissions call is in ios.ts:configurePodfile.
 */
export function getCallingPodfilePermissions(hasVideo: boolean): string[] {
  const perms = ['Microphone'];
  if (hasVideo) perms.push('Camera');
  return perms;
}
