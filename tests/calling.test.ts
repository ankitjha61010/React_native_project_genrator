import { describe, it, expect } from 'vitest';
import { prepareGeneration } from '../src/core/context.js';
import { renderPlan } from '../src/generators/fileGenerator.js';
import type { ProjectOptions } from '../src/core/types.js';
import { resolveDependencies, getProfile } from '../src/config/compatibility.js';

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
    notifications: false,
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
    termsAndConditions: false,
    deleteAccount: false,
    googleLocation: false,
    drawer: false,
    ota: false,
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

describe('Calling Generation', () => {
  it('generates no calling files when audioCall and videoCall are false', async () => {
    const opts = baseOptions({ audioCall: false, videoCall: false });
    const prepared = prepareGeneration(opts);
    const files = await renderPlan(prepared);
    const callingFiles = files.filter(f => f.path.includes('calling'));
    expect(callingFiles.length).toBe(0);
  });

  it('generates audio calling files when audioCall is true and videoCall is false', async () => {
    const opts = baseOptions({ audioCall: true, videoCall: false });
    const prepared = prepareGeneration(opts);
    const files = await renderPlan(prepared);
    const paths = files.map(f => f.path);

    expect(paths.some(p => p.includes('AudioCallScreen'))).toBe(true);
    expect(paths.some(p => p.includes('VideoCallScreen'))).toBe(false);
    expect(paths.some(p => p.includes('MinimizedCallBar'))).toBe(true);
    expect(paths.some(p => p.includes('CallHistoryScreen'))).toBe(true);
    expect(paths.some(p => p.includes('agoraService'))).toBe(true);
    expect(paths.some(p => p.includes('callKeepService'))).toBe(true);
    expect(paths.some(p => p.includes('nativeCallService'))).toBe(true);
    expect(paths.some(p => p.includes('CallContext'))).toBe(true);

    const profile = getProfile(opts.reactNativeVersion);
    const deps = resolveDependencies(profile, opts);
    expect(deps.dependencies['react-native-agora']).toBeDefined();
    expect(deps.dependencies['react-native-callkeep']).toBeDefined();
  });

  it('generates video calling files when audioCall is false and videoCall is true', async () => {
    const opts = baseOptions({ audioCall: false, videoCall: true });
    const prepared = prepareGeneration(opts);
    const files = await renderPlan(prepared);
    const paths = files.map(f => f.path);

    expect(paths.some(p => p.includes('VideoCallScreen'))).toBe(true);
    expect(paths.some(p => p.includes('AudioCallScreen'))).toBe(false);
    expect(paths.some(p => p.includes('MinimizedCallBar'))).toBe(true);
    expect(paths.some(p => p.includes('agoraService'))).toBe(true);

    const profile = getProfile(opts.reactNativeVersion);
    const deps = resolveDependencies(profile, opts);
    expect(deps.dependencies['react-native-agora']).toBeDefined();
    expect(deps.dependencies['react-native-callkeep']).toBeDefined();
  });

  it('generates both audio and video calling files when both are true', async () => {
    const opts = baseOptions({ audioCall: true, videoCall: true, chat: true, groupChat: true });
    const prepared = prepareGeneration(opts);
    const files = await renderPlan(prepared);
    const paths = files.map(f => f.path);

    expect(paths.some(p => p.includes('AudioCallScreen'))).toBe(true);
    expect(paths.some(p => p.includes('VideoCallScreen'))).toBe(true);
    expect(paths.some(p => p.includes('MinimizedCallBar'))).toBe(true);
    expect(paths.some(p => p.includes('IncomingCallScreen'))).toBe(true);
    expect(paths.some(p => p.includes('OutgoingCallScreen'))).toBe(true);
    expect(paths.some(p => p.includes('CallHistoryScreen'))).toBe(true);
  });
});

import { prepareBackendContext } from '../src/backend/context.js';
import { createBackendPlan, renderBackendPlan } from '../src/backend/plan.js';
import type { BackendOptions } from '../src/backend/types.js';

function baseBackendOptions(overrides: Partial<BackendOptions> = {}): BackendOptions {
  return {
    appName: 'TestBackend',
    displayName: 'Test Backend',
    appPackage: 'com.test.app',
    projectDir: '/tmp/test-backend',
    framework: 'express',
    architecture: 'feature-based',
    database: 'postgresql',
    orm: 'prisma',
    auth: 'jwt',
    authMethods: { email: true, mobileOtp: false, google: false, facebook: false, apple: false },
    hashing: 'bcrypt',
    security: { helmet: true, cors: true, rateLimit: true, authRateLimit: true, bodyLimit: true, sanitize: true, accountLockout: false },
    modules: { chat: false, groupChat: false, audioCall: true, videoCall: true, notifications: false, legal: false, deleteAccount: false },
    apiEncryption: false,
    swagger: false,
    redis: false,
    docker: false,
    initGit: false,
    installDependencies: false,
    ...overrides,
  };
}

describe('Backend Calling Generation', () => {
  it('generates Express calling endpoints and repository when calling is enabled', async () => {
    const opts = baseBackendOptions({ framework: 'express', orm: 'prisma' });
    const ctx = prepareBackendContext(opts);
    const plan = createBackendPlan(ctx);
    const rendered = await renderBackendPlan(ctx, plan);
    const paths = rendered.map(f => f.path);

    expect(paths.some(p => p.includes('calling.routes'))).toBe(true);
    expect(paths.some(p => p.includes('calling.controller'))).toBe(true);
    expect(paths.some(p => p.includes('calling.service'))).toBe(true);
    expect(paths.some(p => p.includes('call.entity'))).toBe(true);
    expect(paths.some(p => p.includes('calling.repository'))).toBe(true);
    expect(paths.some(p => p.includes('calling.prisma'))).toBe(true);
  });

  it('generates NestJS calling controller and module when calling is enabled', async () => {
    const opts = baseBackendOptions({ framework: 'nestjs', orm: 'mongoose', database: 'mongodb' });
    const ctx = prepareBackendContext(opts);
    const plan = createBackendPlan(ctx);
    const rendered = await renderBackendPlan(ctx, plan);
    const paths = rendered.map(f => f.path);

    expect(paths.some(p => p.includes('calling.controller'))).toBe(true);
    expect(paths.some(p => p.includes('calling.dto'))).toBe(true);
    expect(paths.some(p => p.includes('calling.service'))).toBe(true);
    expect(paths.some(p => p.includes('call.models'))).toBe(true);
    expect(paths.some(p => p.includes('calling.repository'))).toBe(true);
  });

  it('includes Agora and Firebase env variables in .env and .env.example when calling is enabled', async () => {
    const opts = baseBackendOptions({
      framework: 'express',
      orm: 'prisma',
      firebaseServiceAccountPath: '/path/to/firebase-service-account.json',
      agoraAppId: 'test-app-id',
      agoraAppCertificate: 'test-cert',
    });
    const ctx = prepareBackendContext(opts);
    const plan = createBackendPlan(ctx);
    const rendered = await renderBackendPlan(ctx, plan);

    const envFile = rendered.find(f => f.path === '.env');
    const envExample = rendered.find(f => f.path === '.env.example');

    expect(envFile).toBeDefined();
    expect(envExample).toBeDefined();

    expect(envFile!.content).toContain('AGORA_APP_ID=test-app-id');
    expect(envFile!.content).toContain('AGORA_APP_CERTIFICATE=test-cert');
    expect(envFile!.content).toContain('CALL_TIMEOUT_SECONDS=60');
    expect(envFile!.content).toContain('FIREBASE_SERVICE_ACCOUNT=./firebase-service-account.json');

    expect(envExample!.content).toContain('AGORA_APP_ID=');
    expect(envExample!.content).toContain('AGORA_APP_CERTIFICATE=');
    expect(envExample!.content).toContain('CALL_TIMEOUT_SECONDS=60');
    expect(envExample!.content).toContain('FIREBASE_SERVICE_ACCOUNT=');
  });
});
