import { createPublicKey, sign, verify } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import { describe, it, expect, afterAll } from 'vitest';
import { prepareGeneration } from '../src/core/context.js';
import { renderPlan } from '../src/generators/fileGenerator.js';
import type { ProjectOptions } from '../src/core/types.js';
import { resolveDependencies, getProfile } from '../src/config/compatibility.js';
import { renderBackend } from '../src/backend/generator.js';
import type { BackendOptions } from '../src/backend/types.js';
import { getOTABundleResolverSource, getOTAManagerModuleSource } from '../src/generators/native/androidOTA.js';
import { getOTAManagerSwiftSource, getOTAManagerBridgeSource } from '../src/generators/native/iosOTA.js';
import { generateOTAKeys } from '../src/generators/native/otaKeys.js';
import { generateAdminPanel } from '../src/generators/adminGenerator.js';

function baseOptions(overrides: Partial<ProjectOptions> = {}): ProjectOptions {
  return {
    appName: 'TestApp',
    displayName: 'Test App',
    packageName: 'com.test.app',
    parentDir: '/tmp',
    architecture: 'feature-based',
    stateManagement: 'zustand',
    storage: 'mmkv',
    apiEncryption: false,
    rtl: false,
    themeContext: true,
    vectorIcons: true,
    notifications: true,
    analytics: false,
    authEmail: true,
    authMobile: false,
    socialAuth: { google: false, facebook: false, apple: false },
    socialCredentials: {},
    socket: false,
    chat: false,
    groupChat: false,
    audioCall: false,
    videoCall: false,
    termsAndConditions: true,
    deleteAccount: true,
    googleLocation: false,
    drawer: false,
    ota: false,
    inAppPurchase: 'none',
    paymentGateway: 'none',
    paymentCredentials: {},
    adminPanel: false,
    initGit: false,
    installDependencies: false,
    installPods: false,
    overwrite: true,
    reactNativeVersion: '0.87.1',
    firebase: {},
    ...overrides,
  };
}

describe('OTA Updates Module', () => {
  it('does not generate OTA files when ota is false', async () => {
    const opts = baseOptions({ ota: false });
    const prepared = prepareGeneration(opts);
    const files = await renderPlan(prepared);
    const otaFiles = files.filter(f => f.path.includes('ota') || f.path.includes('OTA'));
    expect(otaFiles.length).toBe(0);
    expect(String(files.find(f => f.path === 'README.md')?.content)).not.toContain('ota:android');
    expect(String(files.find(f => f.path === '.gitignore')?.content)).not.toContain('ota-builds');
  });

  it('generates frontend OTA service, hook, types, and modal when ota is true', async () => {
    const opts = baseOptions({ ota: true });
    const prepared = prepareGeneration(opts);
    const files = await renderPlan(prepared);
    const paths = files.map(f => f.path);

    expect(paths.some(p => p.includes('OTAService.ts'))).toBe(true);
    expect(paths.some(p => p.includes('useOTA.ts'))).toBe(true);
    expect(paths.some(p => p.includes('OTAUpdateModal.tsx'))).toBe(true);
    expect(paths.some(p => p.includes('ota.types.ts'))).toBe(true);

    // The signed-archive script + its docs and git-ignore rules.
    expect(paths).toContain('scripts/ota-bundle.mjs');
    const readme = String(files.find(f => f.path === 'README.md')?.content);
    expect(readme).toContain('npm run ota:android');
    expect(String(files.find(f => f.path === '.gitignore')?.content)).toContain('ota/*.pem');

    // AppProviders mounts OTAUpdateModal when OTA is true
    const appProviders = files.find(f => f.path.includes('AppProviders.tsx'));
    expect(appProviders).toBeDefined();
    expect(String(appProviders?.content)).toContain('OTAUpdateModal');
  });

  it('includes required OTA native dependencies when ota is true', () => {
    const profile = getProfile('0.87.1');
    const deps = resolveDependencies(profile, {
      architecture: 'feature-based',
      stateManagement: 'zustand',
      apiEncryption: false,
      vectorIcons: true,
      notifications: true,
      analytics: false,
      storage: 'mmkv',
      socket: false,
      chat: false,
      socialAuth: { google: false, facebook: false, apple: false },
      googleLocation: false,
      audioCall: false,
      videoCall: false,
      ota: true,
    });

    expect(deps.dependencies).toHaveProperty('react-native-fs');
    expect(deps.dependencies).toHaveProperty('react-native-zip-archive');
    expect(deps.dependencies).toHaveProperty('react-native-restart');
    expect(deps.dependencies).toHaveProperty('react-native-device-info');
  });

  it('generates valid Android native OTA sources with package name substitution', () => {
    const resolverSource = getOTABundleResolverSource('com.example.myapp');
    expect(resolverSource).toContain('package com.example.myapp.ota;');
    expect(resolverSource).toContain('public final class OTABundleResolver');
    expect(resolverSource).toContain('resolvedJSBundleFile');

    const keys = generateOTAKeys();
    const moduleSource = getOTAManagerModuleSource('com.example.myapp', keys.publicKeySpki);
    expect(moduleSource).toContain(`"${keys.publicKeySpki}"`);
    expect(moduleSource).toContain('package com.example.myapp.ota;');
    expect(moduleSource).toContain('public class OTAManagerModule extends ReactContextBaseJavaModule');
    expect(moduleSource).toContain('@ReactMethod');
    expect(moduleSource).toContain('getCurrentMetadata');
  });

  it('generates valid iOS native OTA sources matching Zydus frontline reference', () => {
    const keys = generateOTAKeys();
    const swiftSource = getOTAManagerSwiftSource(keys.publicKeyPkcs1);
    expect(swiftSource).toContain(`kOTAPublicKeyBase64 = "${keys.publicKeyPkcs1}"`);
    expect(swiftSource).toContain('@objc(OTAManager)');
    expect(swiftSource).toContain('class OTAManager: NSObject');
    expect(swiftSource).toContain('resolvedBundleURL');

    const bridgeSource = getOTAManagerBridgeSource();
    expect(bridgeSource).toContain('RCT_EXTERN_MODULE(OTAManager, NSObject)');
    expect(bridgeSource).toContain('RCT_EXTERN_METHOD(getCurrentMetadata');
  });

  it('gives every project its own OTA key pair whose signatures verify', () => {
    const a = generateOTAKeys();
    const b = generateOTAKeys();
    expect(a.publicKeySpki).not.toBe(b.publicKeySpki);
    const data = Buffer.from('release.zip bytes');
    const signature = sign('sha256', data, a.privateKeyPem);
    const spki = createPublicKey({ key: Buffer.from(a.publicKeySpki, 'base64'), format: 'der', type: 'spki' });
    const pkcs1 = createPublicKey({ key: Buffer.from(a.publicKeyPkcs1, 'base64'), format: 'der', type: 'pkcs1' });
    expect(verify('sha256', data, spki, signature)).toBe(true);
    expect(verify('sha256', data, pkcs1, signature)).toBe(true);
  });

  it('generates backend OTA routes and controllers in Express and NestJS', async () => {
    const expressOpts: BackendOptions = {
      appName: 'test-api',
      displayName: 'Test API',
      framework: 'express',
      architecture: 'feature-based',
      database: 'postgresql',
      orm: 'prisma',
      auth: 'access-refresh',
      authMethods: { email: true, mobileOtp: false, google: false, facebook: false, apple: false },
      hashing: 'bcrypt',
      swagger: true,
      security: { helmet: true, cors: true, rateLimit: true, authRateLimit: true, bodyLimit: true, sanitize: false, accountLockout: false },
      modules: { chat: false, groupChat: false, audioCall: false, videoCall: false, notifications: false, legal: false, deleteAccount: false, ota: true },
      apiEncryption: false,
      appPackage: 'com.test.api',
      deployment: 'monolith',
      redis: false,
      docker: false,
      projectDir: '/tmp/test-api',
      initGit: false,
      installDependencies: false,
    };

    const expressResult = await renderBackend(expressOpts);
    const expressPaths = expressResult.files.map(f => f.path);
    expect(expressPaths.some(p => p.includes('ota.routes.ts'))).toBe(true);
    expect(expressPaths.some(p => p.includes('ota.controller.ts'))).toBe(true);
    expect(expressPaths.some(p => p.includes('ota.service.ts'))).toBe(true);

    const nestOpts: BackendOptions = {
      ...expressOpts,
      framework: 'nestjs',
    };
    const nestResult = await renderBackend(nestOpts);
    const nestPaths = nestResult.files.map(f => f.path);
    expect(nestPaths.some(p => p.includes('ota.controller.ts'))).toBe(true);
    expect(nestPaths.some(p => p.includes('ota.dto.ts'))).toBe(true);
  });
});

describe('VoIP Token Registration', () => {
  it('registers VoIP token on HomeScreen when on iOS', async () => {
    const opts = baseOptions({ audioCall: true });
    const prepared = prepareGeneration(opts);
    const files = await renderPlan(prepared);

    const homeScreen = files.find(f => f.path.includes('HomeScreen.tsx'));
    expect(homeScreen).toBeDefined();
    const content = String(homeScreen?.content);
    expect(content).toContain('syncVoipTokenWithBackend');
    expect(content).toContain("Platform.OS === 'ios'");
  });

  it('provides deviceApi updateVoipToken method', async () => {
    const opts = baseOptions({ audioCall: true });
    const prepared = prepareGeneration(opts);
    const files = await renderPlan(prepared);

    const deviceApi = files.find(f => f.path.includes('deviceApi.ts'));
    expect(deviceApi).toBeDefined();
    const content = String(deviceApi?.content);
    expect(content).toContain('updateVoipToken');
    expect(content).toContain('/devices/${encodeURIComponent(deviceId)}/voip-token');
  });
});

describe('Admin Panel Generation', () => {
  const tempTestDir = path.join(os.tmpdir(), `admin-test-${Date.now()}`);

  afterAll(async () => {
    await fs.remove(tempTestDir).catch(() => undefined);
  });

  it('generates a complete React (Vite) admin console with all core modules', async () => {
    const reactAdminDir = path.join(tempTestDir, 'react-admin');
    const summary = await generateAdminPanel({
      adminDir: reactAdminDir,
      techStack: 'react',
      appName: 'SuperApp',
      displayName: 'Super App',
      apiBaseUrl: 'http://localhost:3000/api/v1',
      ota: true,
      installDependencies: false,
    });

    expect(summary.files).toBeGreaterThan(15);
    expect(await fs.pathExists(path.join(reactAdminDir, 'src/App.tsx'))).toBe(true);
    expect(await fs.pathExists(path.join(reactAdminDir, 'src/pages/UsersPage.tsx'))).toBe(true);
    expect(await fs.pathExists(path.join(reactAdminDir, 'src/pages/BroadcastsPage.tsx'))).toBe(true);
    expect(await fs.pathExists(path.join(reactAdminDir, 'src/pages/LegalPage.tsx'))).toBe(true);
    expect(await fs.pathExists(path.join(reactAdminDir, 'src/pages/OTAPage.tsx'))).toBe(true);
    expect(await fs.pathExists(path.join(reactAdminDir, 'src/pages/LoginPage.tsx'))).toBe(true);

    const usersPageContent = await fs.readFile(path.join(reactAdminDir, 'src/pages/UsersPage.tsx'), 'utf8');
    expect(usersPageContent).toContain('/users');
    expect(usersPageContent).toContain('handleRoleToggle');
    expect(usersPageContent).toContain('handleStatusToggle');

    const loginContent = await fs.readFile(path.join(reactAdminDir, 'src/context/AuthContext.tsx'), 'utf8');
    expect(loginContent).toContain("userRole !== 'ADMIN'");
  });

  it('generates a complete Next.js (App Router) admin console with all core modules', async () => {
    const nextAdminDir = path.join(tempTestDir, 'next-admin');
    const summary = await generateAdminPanel({
      adminDir: nextAdminDir,
      techStack: 'next',
      appName: 'SuperApp',
      displayName: 'Super App',
      apiBaseUrl: 'http://localhost:3000/api/v1',
      ota: true,
      installDependencies: false,
    });

    expect(summary.files).toBeGreaterThan(15);
    expect(await fs.pathExists(path.join(nextAdminDir, 'src/app/page.tsx'))).toBe(true);
    expect(await fs.pathExists(path.join(nextAdminDir, 'src/app/users/page.tsx'))).toBe(true);
    expect(await fs.pathExists(path.join(nextAdminDir, 'src/app/broadcasts/page.tsx'))).toBe(true);
    expect(await fs.pathExists(path.join(nextAdminDir, 'src/app/legal/page.tsx'))).toBe(true);
    expect(await fs.pathExists(path.join(nextAdminDir, 'src/app/ota/page.tsx'))).toBe(true);
    expect(await fs.pathExists(path.join(nextAdminDir, 'src/app/login/page.tsx'))).toBe(true);

    const otaPageContent = await fs.readFile(path.join(nextAdminDir, 'src/app/ota/page.tsx'), 'utf8');
    expect(otaPageContent).toContain('/ota/releases');
    expect(otaPageContent).toContain('handleRollback');
  });
});
