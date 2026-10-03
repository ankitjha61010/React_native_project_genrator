import { describe, it, expect } from 'vitest';
import { renderBackend } from '../src/backend/generator.js';
import type { BackendOptions } from '../src/backend/types.js';

function backend(overrides: Partial<BackendOptions> = {}, modules: Partial<BackendOptions['modules']> = {}): BackendOptions {
  return {
    appName: 'tester-api',
    displayName: 'Tester API',
    framework: 'express',
    architecture: 'feature-based',
    database: 'postgresql',
    orm: 'prisma',
    auth: 'refresh-rotation',
    authMethods: { email: true, mobileOtp: false, google: false, facebook: false, apple: false },
    hashing: 'bcrypt',
    swagger: true,
    security: { helmet: true, cors: true, rateLimit: true, authRateLimit: true, bodyLimit: true, sanitize: false, accountLockout: false },
    modules: { chat: true, groupChat: true, audioCall: true, videoCall: true, notifications: false, legal: false, deleteAccount: false, ...modules },
    apiEncryption: true,
    appPackage: 'com.tester.app',
    deployment: 'monolith',
    redis: false,
    docker: false,
    projectDir: '/tmp/tester-api',
    initGit: false,
    installDependencies: false,
    ...overrides,
  };
}

type Files = Array<{ path: string; content: string }>;
const content = (files: Files, end: string) => files.find(f => f.path.endsWith(end))?.content ?? '';
const has = (files: Files, end: string) => files.some(f => f.path.endsWith(end));
const unrendered = (files: Files) => files.filter(f => /\{\{[#/A-Z]/.test(f.content)).map(f => f.path);

describe('backend – realtime tester page', () => {
  it('chat + calls: both panels, mounted outside production, documented in the README', async () => {
    const { files } = await renderBackend(backend());
    expect(unrendered(files)).toEqual([]);
    for (const file of ['tester/index.html', 'tester/tester.js', 'tester/tester.css', 'tester.page.ts']) expect(has(files, file)).toBe(true);

    const html = content(files, 'tester/index.html');
    expect(html).toContain('id="chatCard"');
    expect(html).toContain('id="callCard"');
    expect(html).toContain('id="audioCallBtn"');
    expect(html).toContain('id="videoCallBtn"');
    expect(html).toContain('crypto-js');
    expect(html).toContain('agora-rtc-sdk-ng');
    // Relative, so the page works at /tester/ and its file:// redirect script loads from disk.
    expect(html).toContain('href="tester.css"');
    expect(html).toContain('<script src="tester.js"></script>');

    const js = content(files, 'tester/tester.js');
    expect(js).toContain("handlers['chat:receive_message']");
    expect(js).toContain("handlers['call:incoming']");
    expect(js).toContain('function encrypt(');
    expect(js).toContain("location.replace('http://localhost:3000/tester/')");

    const app = content(files, 'src/app.ts');
    expect(app).toContain("if (!config.isProduction) app.use('/tester', testerPage);");
    expect(content(files, 'tester.page.ts')).toContain('config.encryption.enabled');

    const readme = content(files, 'README.md');
    expect(readme).toContain('### Realtime tester (browser)');
    expect(readme).toContain('**chat** and **calls**');
  });

  it('calls only (audio): no chat panel, no video button', async () => {
    const { files } = await renderBackend(backend({ apiEncryption: false }, { chat: false, groupChat: false, videoCall: false }));
    expect(unrendered(files)).toEqual([]);
    const html = content(files, 'tester/index.html');
    expect(html).not.toContain('id="chatCard"');
    expect(html).toContain('id="callCard"');
    expect(html).toContain('id="audioCallBtn"');
    expect(html).not.toContain('id="videoCallBtn"');
    expect(html).not.toContain('crypto-js');
    const js = content(files, 'tester/tester.js');
    expect(js).not.toContain('chat:receive_message');
    expect(js).not.toContain('CryptoJS');
    expect(content(files, 'README.md')).toContain('test **calls** end to end');
  });

  it('chat only: no call panel, no Agora SDK', async () => {
    const { files } = await renderBackend(backend({}, { audioCall: false, videoCall: false }));
    expect(unrendered(files)).toEqual([]);
    const html = content(files, 'tester/index.html');
    expect(html).toContain('id="chatCard"');
    expect(html).not.toContain('id="callCard"');
    expect(html).not.toContain('agora');
    expect(content(files, 'tester/tester.js')).not.toContain('call:incoming');
    expect(content(files, 'README.md')).toContain('test **chat** end to end');
  });

  it('neither chat nor calls: no tester at all', async () => {
    const { files } = await renderBackend(backend({}, { chat: false, groupChat: false, audioCall: false, videoCall: false }));
    expect(has(files, 'tester/index.html')).toBe(false);
    expect(has(files, 'tester.page.ts')).toBe(false);
    expect(content(files, 'README.md')).not.toContain('Realtime tester');
  });

  it('NestJS: mounted in app.setup.ts', async () => {
    const { files } = await renderBackend(backend({ framework: 'nestjs' }));
    expect(unrendered(files)).toEqual([]);
    expect(content(files, 'app.setup.ts')).toContain("if (!config.isProduction) app.use('/tester', testerPage);");
  });
});

describe('backend – Express Swagger documents the calling endpoints', () => {
  it('calling docs are an ApiDocGroup registered in openapi.ts', async () => {
    const { files } = await renderBackend(backend());
    const openapi = content(files, 'openapi.ts');
    expect(openapi).toContain('import { callingDocs }');
    expect(openapi).toMatch(/const groups: ApiDocGroup\[] = \[[^\]]*callingDocs/);
    const docs = content(files, 'calling.docs.ts');
    expect(docs).toContain("tag: 'Calling'");
    for (const path of ['/calls', '/calls/group', '/calls/history', '/calls/:callId/accept', '/calls/:callId/agora-token']) expect(docs).toContain(`path: '${path}'`);
  });
});
