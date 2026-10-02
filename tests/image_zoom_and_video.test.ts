import { describe, it, expect } from 'vitest';
import { resolveDependencies, getProfile } from '../src/config/compatibility.js';
import { prepareGeneration } from '../src/core/context.js';
import { renderPlan } from '../src/generators/fileGenerator.js';
import type { ProjectOptions } from '../src/core/types.js';

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
    socket: true,
    chat: true,
    groupChat: true,
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

describe('Image Zoom & Chat Video Fixes', () => {
  it('includes @likashefqet/react-native-image-zoom in dependencies and profile', () => {
    const profile = getProfile('0.87.1');
    expect(profile.packages['@likashefqet/react-native-image-zoom']).toBeDefined();

    const resolved = resolveDependencies(profile, baseOptions());
    expect(resolved.dependencies['@likashefqet/react-native-image-zoom']).toBeDefined();
  });

  it('renders ChatMediaPreview with ImageZoom and GestureHandlerRootView', async () => {
    const context = prepareGeneration(baseOptions());
    const files = await renderPlan(context);

    const previewFile = files.find(f => f.path.endsWith('ChatMediaPreview.tsx'));
    expect(previewFile).toBeDefined();

    const content = previewFile!.content;
    expect(content).toContain("import { ImageZoom } from '@likashefqet/react-native-image-zoom'");
    expect(content).toContain("import { GestureHandlerRootView } from 'react-native-gesture-handler'");
    expect(content).toContain('<ImageZoom');
    expect(content).toContain('isPinchEnabled');
    expect(content).toContain('isDoubleTapEnabled');
    expect(content).toContain('allowFileAccess');
    expect(content).toContain('allowUniversalAccessFromFileURLs');
  });

  it('renders ChatBubble with videoPoster fallback instead of passing video URL directly to Image', async () => {
    const context = prepareGeneration(baseOptions());
    const files = await renderPlan(context);

    const bubbleFile = files.find(f => f.path.endsWith('ChatBubble.tsx'));
    expect(bubbleFile).toBeDefined();

    const content = bubbleFile!.content;
    expect(content).toContain('styles.videoPoster');
    expect(content).not.toContain('<Image source={{ uri: message.thumbnailUrl || message.mediaUrl }}');
  });

  it('ensures ChatInputBar assigns proper extension and mimeType when sending media', async () => {
    const context = prepareGeneration(baseOptions());
    const files = await renderPlan(context);

    const inputBarFile = files.find(f => f.path.endsWith('ChatInputBar.tsx'));
    expect(inputBarFile).toBeDefined();

    const content = inputBarFile!.content;
    expect(content).toContain("isVideo ? '.mp4' : '.jpg'");
    expect(content).toContain("mimeType: isVideo ? 'video/mp4' : 'image/jpeg'");
  });
});
