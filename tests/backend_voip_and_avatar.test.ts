import { describe, it, expect } from 'vitest';
import { renderBackend } from '../src/backend/generator.js';
import type { BackendOptions } from '../src/backend/types.js';

function backend(overrides: Partial<BackendOptions> = {}, modules: Partial<BackendOptions['modules']> = {}): BackendOptions {
  return {
    appName: 'call-api',
    displayName: 'Call API',
    framework: 'express',
    architecture: 'feature-based',
    database: 'postgresql',
    orm: 'prisma',
    auth: 'refresh-rotation',
    authMethods: { email: true, mobileOtp: false, google: false, facebook: false, apple: false },
    hashing: 'bcrypt',
    swagger: true,
    security: { helmet: true, cors: true, rateLimit: true, authRateLimit: true, bodyLimit: true, sanitize: false, accountLockout: false },
    modules: { chat: true, groupChat: true, audioCall: true, videoCall: true, notifications: true, legal: false, deleteAccount: false, ...modules },
    apiEncryption: false,
    appPackage: 'com.call.app',
    deployment: 'monolith',
    redis: false,
    docker: false,
    projectDir: '/tmp/call-api',
    initGit: false,
    installDependencies: false,
    ...overrides,
  };
}

type Files = Array<{ path: string; content: string }>;
const content = (files: Files, end: string) => files.find(f => f.path.endsWith(end))?.content ?? '';
const unrendered = (files: Files) => files.filter(f => /\{\{[#/A-Z]/.test(f.content)).map(f => f.path);

describe('backend – admin avatar route', () => {
  it('Express: POST / DELETE /users/:id/avatar behind users:write, documented', async () => {
    const { files } = await renderBackend(backend());
    const routes = content(files, 'users.routes.ts');
    expect(routes).toContain("router.post('/:id/avatar', requirePermission('users:write'), upload('avatar'), users.setAvatarOf);");
    expect(routes).toContain("router.delete('/:id/avatar', requirePermission('users:write'), users.removeAvatarOf);");
    expect(content(files, 'users.docs.ts')).toContain("path: '/users/:id/avatar'");
    expect(content(files, 'docs/API.md')).toContain('`/users/:id/avatar`');
  });

  it('NestJS: the same routes with @RequirePermissions(users:write) + @Upload(avatar)', async () => {
    const { files } = await renderBackend(backend({ framework: 'nestjs' }));
    const controller = content(files, 'users.controller.ts');
    expect(controller).toMatch(/@Post\(':id\/avatar'\)\s+@RequirePermissions\('users:write'\)\s+@Upload\('avatar'\)/);
    expect(controller).toMatch(/@Delete\(':id\/avatar'\)\s+@RequirePermissions\('users:write'\)/);
  });
});

describe('backend – iOS VoIP push', () => {
  it('Express: POST /calls/voip-token, the APNs sender wired into ringing, env + README', async () => {
    const { files } = await renderBackend(backend());
    expect(unrendered(files)).toEqual([]);
    expect(content(files, 'calling.routes.ts')).toContain("router.post('/voip-token', controller.registerVoipToken);");
    expect(content(files, 'calling.controller.ts')).toContain('this.devices.registerVoipToken(');
    const sender = content(files, 'voip-push-sender.ts');
    expect(sender).toContain("from 'node:http2'");
    expect(sender).toContain("'apns-push-type': 'voip'");
    expect(sender).not.toMatch(/from '(?!node:|\.)/);
    const service = content(files, 'calling.service.ts');
    expect(service).toContain('uuid: callKitUuid(call.id)');
    expect(service).toContain('this.deps\n        .voipPush(');
    expect(content(files, 'container.ts')).toContain('voipPushSender: createVoipPushSender(config.apns, logger)');
    for (const name of ['APNS_KEY_ID', 'APNS_TEAM_ID', 'APNS_KEY_PATH', 'APNS_BUNDLE_ID', 'APNS_PRODUCTION']) {
      expect(content(files, '.env.example')).toContain(`${name}=`);
      expect(content(files, 'env.ts')).toContain(`${name}:`);
    }
    expect(content(files, '.env')).toContain('APNS_BUNDLE_ID=com.call.app');
    expect(content(files, 'README.md')).toContain('## iOS VoIP push (PushKit)');
  });

  it('NestJS: the calling controller gets DevicesService for POST /calls/voip-token', async () => {
    const { files } = await renderBackend(backend({ framework: 'nestjs', database: 'mongodb', orm: 'mongoose', architecture: 'clean' }));
    expect(unrendered(files)).toEqual([]);
    const controller = content(files, 'calling.controller.ts');
    expect(controller).toContain("@Post('voip-token')");
    expect(controller).toContain('private readonly devices: DevicesService');
    // Clean architecture: the port in its own file.
    expect(files.some(f => f.path.endsWith('ports/voip-push-sender.ts'))).toBe(true);
  });

  it('calling without push notifications: the route answers but there is no VoIP sender (no devices)', async () => {
    const { files } = await renderBackend(backend({}, { notifications: false }));
    expect(unrendered(files)).toEqual([]);
    expect(files.some(f => f.path.endsWith('voip-push-sender.ts'))).toBe(false);
    expect(content(files, 'calling.controller.ts')).toContain('CALLING_MESSAGES.voipTokenIgnored');
    expect(content(files, '.env')).not.toContain('APNS_KEY_ID');
  });
});
