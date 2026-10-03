import { describe, it, expect } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import plist from 'plist';
import { configureIosSceneLifecycle } from '../src/generators/native/ios.js';

/** React Native 0.87 template AppDelegate.swift. */
const STOCK_APP_DELEGATE = `import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "ShopApp",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func bundleURL() -> URL? {
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
  }
}
`;

const STOCK_INFO_PLIST = plist.build({ CFBundleName: 'ShopApp', UIBackgroundModes: ['audio'] });

async function project() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'scene-'));
  await fs.outputFile(path.join(dir, 'ios', 'ShopApp', 'AppDelegate.swift'), STOCK_APP_DELEGATE);
  await fs.outputFile(path.join(dir, 'ios', 'ShopApp', 'Info.plist'), STOCK_INFO_PLIST);
  return dir;
}

describe('iOS – UIScene lifecycle (required from the iOS 27 SDK)', () => {
  it('adds a scene manifest, keeps other Info.plist keys', async () => {
    const dir = await project();
    await configureIosSceneLifecycle(dir, 'ShopApp');
    const data = plist.parse(await fs.readFile(path.join(dir, 'ios', 'ShopApp', 'Info.plist'), 'utf8')) as Record<string, any>;
    expect(data.UIBackgroundModes).toEqual(['audio']);
    expect(data.UIApplicationSceneManifest.UIApplicationSupportsMultipleScenes).toBe(false);
    expect(data.UIApplicationSceneManifest.UISceneConfigurations.UIWindowSceneSessionRoleApplication[0].UISceneDelegateClassName).toBe(
      '$(PRODUCT_MODULE_NAME).SceneDelegate',
    );
    await fs.remove(dir);
  });

  it('moves window creation into SceneDelegate with the app module name, idempotently', async () => {
    const dir = await project();
    await configureIosSceneLifecycle(dir, 'ShopApp');
    await configureIosSceneLifecycle(dir, 'ShopApp');
    const source = await fs.readFile(path.join(dir, 'ios', 'ShopApp', 'AppDelegate.swift'), 'utf8');

    expect(source).not.toContain('UIWindow(frame: UIScreen.main.bounds)');
    expect(source).toContain('self.launchOptions = launchOptions');
    expect(source.match(/var launchOptions: \[UIApplication\.LaunchOptionsKey: Any\]\?/g)).toHaveLength(1);
    expect(source.match(/class SceneDelegate: UIResponder, UIWindowSceneDelegate/g)).toHaveLength(1);
    expect(source).toContain('UIWindow(windowScene: windowScene)');
    expect(source).toContain('withModuleName: "ShopApp"');
    // URLs reach AppDelegate's handler (Facebook Login) before React Native.
    expect(source).toContain('app.delegate?.application?(app, open: context.url, options: options) == true');
    expect(source).toContain('RCTLinkingManager.application(UIApplication.shared, continue: userActivity');
    await fs.remove(dir);
  });
});
