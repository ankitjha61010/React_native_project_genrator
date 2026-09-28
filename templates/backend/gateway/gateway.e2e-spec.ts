import express from 'express';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
{{#if CHAT}}
import { Server as SocketServer } from 'socket.io';
import { io } from 'socket.io-client';
{{/if}}
import request from 'supertest';
import { createGateway, type ServiceName } from '../src/gateway.js';

/** A fake service that tells who answered. */
function fakeService(name: string): Promise<Server> {
  const app = express();
  app.get('/api/v1/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));
  app.use((req, res) => res.json({ service: name, path: req.originalUrl, forwardedFor: req.get('x-forwarded-for') ?? null }));
  const server = createServer(app);
  return new Promise(resolve => server.listen(0, () => resolve(server)));
}

const url = (server: Server) => `http://localhost:${(server.address() as AddressInfo).port}`;

describe('API gateway', () => {
  const upstream: Partial<Record<ServiceName, Server>> = {};
  let gateway: Server;
{{#if CHAT}}
  let sockets: SocketServer;
{{/if}}

  beforeAll(async () => {
    upstream.identity = await fakeService('identity');
{{#if CHAT}}
    upstream.chat = await fakeService('chat');
    sockets = new SocketServer(upstream.chat, { transports: ['websocket'] });
    sockets.on('connection', socket => socket.emit('hello', 'from chat'));
{{/if}}
{{#if NOTIFICATIONS}}
    upstream.notifications = await fakeService('notifications');
{{/if}}
    gateway = createGateway(Object.fromEntries(Object.entries(upstream).map(([name, server]) => [name, url(server)])) as Record<ServiceName, string>);
    await new Promise<void>(resolve => gateway.listen(0, resolve));
  });

  afterAll(async () => {
{{#if CHAT}}
    await sockets.close();
{{/if}}
    for (const server of [gateway, ...Object.values(upstream)]) {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
  });

  it.each([
    ['/api/v1/auth/login', 'identity'],
    ['/api/v1/users/me', 'identity'],
    ['/uploads/avatars/2026-01/a.jpg', 'identity'],
{{#if CHAT}}
    ['/api/v1/chat/conversations', 'chat'],
    ['/uploads/chat/u1/2026-01/b.jpg', 'chat'],
{{/if}}
{{#if NOTIFICATIONS}}
    ['/api/v1/notifications?page=1', 'notifications'],
{{/if}}
  ])('routes %s to the %s service', async (path, service) => {
    const res = await request(gateway).get(path).expect(200);
    expect(res.body).toMatchObject({ service, path });
    expect(res.body.forwardedFor).toBeTruthy();
  });

  it('answers unknown paths with the error envelope', async () => {
    const res = await request(gateway).get('/api/v1/unknown').expect(404);
    expect(res.body).toMatchObject({ success: false, code: 'ROUTE_NOT_FOUND' });
  });

  it('reports every service in the health check', async () => {
    const res = await request(gateway).get('/api/v1/health').expect(200);
    expect(res.body.data).toMatchObject({ status: 'ok', services: { identity: 'up' } });
  });
{{#if CHAT}}

  it('forwards Socket.IO (websocket) to the chat service', async () => {
    const client = io(url(gateway), { transports: ['websocket'], reconnection: false });
    const hello = await new Promise(resolve => client.once('hello', resolve));
    expect(hello).toBe('from chat');
    client.disconnect();
  });
{{/if}}

  it('answers 502 when a service is down', async () => {
    const down = createGateway({ identity: 'http://127.0.0.1:1'{{#if CHAT}}, chat: 'http://127.0.0.1:1'{{/if}}{{#if NOTIFICATIONS}}, notifications: 'http://127.0.0.1:1'{{/if}} });
    const res = await request(down).get('/api/v1/auth/me').expect(502);
    expect(res.body).toMatchObject({ success: false, code: 'SERVICE_UNAVAILABLE' });
  });
});
