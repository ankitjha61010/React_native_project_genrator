{{#if NEST}}
import type { Server } from 'node:http';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
{{/if}}
{{#if SOCKET_SERVER}}
import { io as connect, type Socket } from 'socket.io-client';
{{/if}}
{{#if AUTH}}
import { UserRole } from '{{IMPORT:domain.roles}}';
{{/if}}
{{#if EXPRESS}}
import { createServices } from '{{IMPORT:app.container}}';
{{#if SOCKET_SERVER}}
import { logger } from '{{IMPORT:core.logger}}';
{{/if}}
{{/if}}
{{#if SOCKET_SERVER}}
{{#if EXPRESS}}
import { attachSocketServer, SocketHub } from '{{IMPORT:realtime.server}}';
{{else}}
import { SocketHub } from '{{IMPORT:realtime.server}}';
{{/if}}
{{/if}}
{{#if EXPRESS}}
import { createApp } from '{{IMPORT:ex.app}}';
{{/if}}
{{#if NEST}}
import { AppModule } from '{{IMPORT:nest.appModule}}';
import { configureApp } from '{{IMPORT:nest.setup}}';
import { DATABASE, INFRASTRUCTURE } from '{{IMPORT:nest.tokens}}';
{{/if}}
{{#if AUTH_API}}
import request from 'supertest';
{{/if}}
import { createTestInfrastructure } from './test-infrastructure.js';

export type TestApp = Awaited<ReturnType<typeof createTestApp>>;

/**
 * The real HTTP app (middleware, validation, errors{{#if SOCKET_SERVER}}, Socket.IO{{/if}}…) on in-memory infrastructure,
 * listening on a random port. Pass `app.server` to supertest.
 */
export async function createTestApp() {
  const test = createTestInfrastructure();
{{#if SOCKET_SERVER}}
  // The real socket hub, so e2e tests can connect with socket.io-client.
  const hub = new SocketHub();
  test.infra.realtime = hub;
{{/if}}
{{#if EXPRESS}}
  const services = createServices(test.infra);
  const server = createApp(services).listen(0);
{{#if SOCKET_SERVER}}
  const io = attachSocketServer(server, hub, {
    authenticate: token => services.sessions.authenticate(token),
    users: test.repositories.users,
{{#if CHAT}}
    isMember: (userId, conversationId) => services.chat.isMember(userId, conversationId),
    markRead: (userId, conversationId) => services.chat.markRead(userId, conversationId),
{{/if}}
    logger,
  });
{{/if}}
  await new Promise<void>(resolve => server.once('listening', resolve));
{{#if SOCKET_SERVER}}
  // Also closes the HTTP server.
  const close = () => io.close();
{{else}}
  const close = () => new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
{{/if}}
{{/if}}
{{#if NEST}}
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DATABASE)
    .useValue({ healthCheck: test.healthCheck, connect: async () => {}, disconnect: async () => {} })
    .overrideProvider(INFRASTRUCTURE)
    .useValue(test.infra)
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false, logger: false });
  configureApp(app);
  await app.init();
  await app.listen(0);
  const server: Server = app.getHttpServer();
  const close = () => app.close();
{{/if}}
  const port = (server.address() as { port: number }).port;
{{#if SOCKET_SERVER}}

  /** A Socket.IO client authenticated with an access token (like the app). */
  const socket = (token: string): Promise<Socket> =>
    new Promise((resolve, reject) => {
      const client = connect(`http://localhost:${port}`, { transports: ['websocket'], auth: { token }, reconnection: false });
      client.once('connect', () => resolve(client));
      client.once('connect_error', reject);
    });
{{/if}}

{{#if AUTH}}

  let accounts = 0;
  /** Creates an account through the API ({{AUTH_METHODS_TEXT}}) → its id + access token.{{#if DEVICE_INPUT}} `device`: sent with the sign-in.{{/if}} */
  const signUp = async (name: string, role: UserRole = UserRole.USER{{#if DEVICE_INPUT}}, device?: Record<string, unknown>{{/if}}) => {
{{#if DEVICE_INPUT}}
    const withDevice = device ? { device } : {};
{{/if}}
    const n = ++accounts;
{{#if AUTH_API}}
{{#if AUTH_EMAIL}}
    const res = await request(server).post('/api/v1/auth/register').send({ name, email: `user${n}@example.com`, password: 'Sup3rSecret'{{#if DEVICE_INPUT}}, ...withDevice{{/if}} }).expect(201);
{{else}}
{{#if AUTH_OTP}}
    const phone = { countryCode: '+1', phone: `55501${String(n).padStart(5, '0')}` };
    await request(server).post('/api/v1/auth/otp/send').send(phone).expect(200);
    const res = await request(server).post('/api/v1/auth/otp/verify').send({ ...phone, name, otp: test.sms.lastCode(`+1${phone.phone}`){{#if DEVICE_INPUT}}, ...withDevice{{/if}} }).expect(200);
{{else}}
    const res = await request(server).post('/api/v1/auth/social').send({ provider: {{SOCIAL_PROVIDER}}, token: `valid:user-${n}:user${n}@example.com`, tokenType: 'idToken', name{{#if DEVICE_INPUT}}, ...withDevice{{/if}} }).expect(200);
{{/if}}
{{/if}}
    const id: string = res.body.data.user.id;
    if (role === UserRole.ADMIN) {
      // Role changes bump the token version – issue a token for the new role directly.
      const admin = await test.repositories.users.update(id, { role: UserRole.ADMIN, tokenVersion: 1 });
      return { id, token: test.infra.tokenService.signAccessToken({ sub: id, role: admin.role, tv: admin.tokenVersion }).token };
    }
    return { id, token: res.body.data.tokens.accessToken as string{{#if AUTH_REFRESH}}, refreshToken: res.body.data.tokens.refreshToken as string{{/if}} };
{{else}}
    // Accounts live in the identity service: create the local copy + a token signed with the shared secret.
    const user = await test.repositories.users.create({ email: `user${n}@example.com`, name, role });
    return { id: user.id, token: test.infra.tokenService.signAccessToken({ sub: user.id, role: user.role, tv: user.tokenVersion }).token };
{{/if}}
  };
{{/if}}

  return { server, port, close, ...test{{#if SOCKET_SERVER}}, socket{{/if}}{{#if AUTH}}, signUp{{/if}} };
}
