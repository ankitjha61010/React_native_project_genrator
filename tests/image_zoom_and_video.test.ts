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
  });

  it('shows chat videos and documents natively – no web view', async () => {
    const context = prepareGeneration(baseOptions());
    const files = await renderPlan(context);

    const preview = files.find(f => f.path.endsWith('ChatMediaPreview.tsx'))!.content;
    expect(preview).not.toContain('react-native-webview');
    expect(preview).not.toContain('docs.google.com');
    expect(preview).toContain("import Pdf from 'react-native-pdf'");
    expect(preview).toContain('<ChatVideoPlayer');

    const player = files.find(f => f.path.endsWith('ChatVideoPlayer.tsx'))!.content;
    expect(player).toContain("from 'react-native-video'");
    expect(player).toContain('<Zoomable');
    expect(player).toContain('ViewType.TEXTURE');

    expect(files.some(f => f.path.endsWith('mediaFiles.ts'))).toBe(true);

    const resolved = resolveDependencies(getProfile('0.87.1'), baseOptions());
    for (const dep of ['react-native-video', 'react-native-pdf', 'react-native-blob-util', '@react-native-documents/viewer']) {
      expect(resolved.dependencies[dep]).toBeDefined();
    }
  });

  it('chat room: native reply swipe, long-press menu, edge-only back swipe', async () => {
    const context = prepareGeneration(baseOptions());
    const files = await renderPlan(context);

    const bubble = files.find(f => f.path.endsWith('ChatBubble.tsx'))!.content;
    expect(bubble).toContain('usePanGesture');
    expect(bubble).not.toContain('PanResponder.create');

    const room = files.find(f => f.path.endsWith('ChatRoomScreen.tsx'))!.content;
    expect(room).toContain('<MessageActionsMenu');
    expect(room).not.toContain("translate('common', 'messageActions')");

    const navigator = files.find(f => f.path.endsWith('MainNavigator.tsx'))!.content;
    expect(navigator).toContain('fullScreenGestureEnabled: false');
  });

  it('video editor: drag-to-trim with a live preview', async () => {
    const context = prepareGeneration(baseOptions());
    const files = await renderPlan(context);
    const editor = files.find(f => f.path.endsWith('MediaEditorModal.tsx'))!.content;
    expect(editor).toContain('<VideoTrimmer');
    expect(editor).toContain("from 'react-native-video'");

    // Without chat there is no react-native-video – the editor must not import it.
    const noChat = await renderPlan(prepareGeneration(baseOptions({ chat: false, groupChat: false })));
    const plainEditor = noChat.find(f => f.path.endsWith('MediaEditorModal.tsx'))!.content;
    expect(plainEditor).not.toContain('react-native-video');
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

describe('Pre-release fixes', () => {
  it('login screen: no email fields without email auth (mobile OTP only)', async () => {
    const files = await renderPlan(prepareGeneration(baseOptions({ authEmail: false, authMobile: true })));
    const form = files.find(f => f.path.endsWith('LoginForm.tsx'))!.content;
    expect(form).not.toContain('name="email"');
    expect(form).toContain('loginWithMobile');

    const withEmail = (await renderPlan(prepareGeneration(baseOptions()))).find(f => f.path.endsWith('LoginForm.tsx'))!.content;
    expect(withEmail).toContain('name="email"');
  });

  it('chat list has a search box; Profile links to Settings', async () => {
    const files = await renderPlan(prepareGeneration(baseOptions()));
    expect(files.find(f => f.path.endsWith('ChatListScreen.tsx'))!.content).toContain("translate('common', 'searchChats')");
    expect(files.find(f => f.path.endsWith('ProfileScreen.tsx'))!.content).toContain("screen: 'Settings'");
  });

  it('calling: "Calling…" screen for the caller, missed calls open the call history', async () => {
    const files = await renderPlan(prepareGeneration(baseOptions({ audioCall: true, notifications: true })));
    expect(files.find(f => f.path.endsWith('CallContext.tsx'))!.content).toContain('<OutgoingCallScreen');
    const types = files.find(f => f.path.endsWith('notificationTypes.ts'))!.content;
    expect(types).toContain("MISSED_CALL: 'MISSED_CALL'");
    expect(types).toContain("screen: 'CallHistory'");
  });

  it('video editor cuts the selected part on the device before sending', async () => {
    const files = await renderPlan(prepareGeneration(baseOptions()));
    const editor = files.find(f => f.path.endsWith('MediaEditorModal.tsx'))!.content;
    expect(editor).toContain("from 'react-native-video-trim'");
    expect(resolveDependencies(getProfile('0.87.1'), baseOptions()).dependencies['react-native-video-trim']).toBeDefined();
  });
});
