import { existsSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { Socket } from 'node:net';
import express from 'express';
import { createProxyMiddleware, type RequestHandler } from 'http-proxy-middleware';
import { pino } from 'pino';

if (process.env.NODE_ENV !== 'production' && existsSync('.env')) process.loadEnvFile('.env');

export const logger = pino({ level: process.env.LOG_LEVEL ?? 'info', base: { service: 'gateway' } });

export type ServiceName = 'identity'{{#if CHAT}} | 'chat'{{/if}}{{#if NOTIFICATIONS}} | 'notifications'{{/if}};

export const config = {
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',
  services: {
    identity: process.env.IDENTITY_URL ?? 'http://localhost:3001',
{{#if CHAT}}
    chat: process.env.CHAT_URL ?? 'http://localhost:3002',
{{/if}}
{{#if NOTIFICATIONS}}
    notifications: process.env.NOTIFICATIONS_URL ?? 'http://localhost:3003',
{{/if}}
  } satisfies Record<ServiceName, string>,
};

/**
 * Which service answers which path – the app only knows the gateway (http://…:3000/api/v1).
 * Bodies are streamed through untouched (validation, auth and encryption happen in the services).
 */
export const ROUTES: Array<{ service: ServiceName; paths: string[]; ws?: boolean }> = [
  // Accounts + the legal pages (GET /api/v1/legal, /terms-and-conditions…).
  { service: 'identity', paths: ['/api/v1/auth', '/api/v1/users', '/api/v1/legal', '/uploads/avatars', '/terms-and-conditions', '/privacy-policy', '/delete-account'] },
{{#if PAYMENTS}}
  // In-app purchases / gateway checkout, webhooks and the admin payment screens (they need the users).
  { service: 'identity', paths: ['/api/v1/payments'] },
{{/if}}
{{#if CHAT}}
  // Socket.IO (chat events, presence{{#if NOTIFICATIONS}}, live notifications{{/if}}) lives in the chat service.
  { service: 'chat', paths: ['/api/v1/chat', '/uploads/chat', '/socket.io'], ws: true },
{{/if}}
{{#if NOTIFICATIONS}}
  // The users' devices (FCM tokens) belong to the service that sends the pushes.
  { service: 'notifications', paths: ['/api/v1/notifications', '/api/v1/devices'] },
{{/if}}
];

/** Every message the gateway itself sends (the services have their own messages files). */
const GATEWAY_MESSAGES = {
  serviceUnavailable: { message: 'The service is temporarily unavailable', code: 'SERVICE_UNAVAILABLE' },
  routeNotFound: (method: string, path: string) => ({ message: `Route ${method} ${path} not found`, code: 'ROUTE_NOT_FOUND' }),
};

/** The same error shape as the services: `{ success: false, message, data: null, code, errors }`. */
const envelope = ({ message, code }: { message: string; code: string }) => ({ success: false, message, data: null, code, errors: [] });

function onProxyError(error: Error, _req: IncomingMessage, res: ServerResponse | Socket): void {
  logger.warn({ err: error }, 'Upstream service unreachable');
  if (!('writeHead' in res)) return void res.destroy();
  if (res.headersSent) return void res.end();
  res.writeHead(502, { 'Content-Type': 'application/json' }).end(JSON.stringify(envelope(GATEWAY_MESSAGES.serviceUnavailable)));
}

/** `GET /api/v1/health`: the gateway and every service (503 when one is down). */
async function health(services: Record<ServiceName, string>) {
  const checks = await Promise.all(
    Object.entries(services).map(async ([name, url]) => {
      try {
        const response = await fetch(`${url}/api/v1/health`, { signal: AbortSignal.timeout(2_000) });
        return [name, response.ok ? 'up' : 'down'] as const;
      } catch {
        return [name, 'down'] as const;
      }
    }),
  );
  const ok = checks.every(([, state]) => state === 'up');
  return { ok, body: { success: true, message: ok ? 'Healthy' : 'Degraded', data: { status: ok ? 'ok' : 'degraded', services: Object.fromEntries(checks) } } };
}

/** The gateway HTTP server (not listening yet – server.ts and the tests call listen). */
export function createGateway(services: Record<ServiceName, string> = config.services): Server {
  const app = express();
  app.disable('x-powered-by');
  // Services see the client's IP (rate limits) through X-Forwarded-For.
  app.set('trust proxy', true);

  app.get('/api/v1/health', async (_req, res) => {
    const { ok, body } = await health(services);
    res.status(ok ? 200 : 503).json(body);
  });

  const proxies: Array<{ ws: boolean; proxy: RequestHandler }> = ROUTES.map(route => ({
    ws: Boolean(route.ws),
    proxy: createProxyMiddleware<IncomingMessage, ServerResponse>({
      target: services[route.service],
      pathFilter: route.paths,
      xfwd: true,
      ws: route.ws,
      proxyTimeout: 120_000,
      on: { error: onProxyError },
    }),
  }));
  for (const { proxy } of proxies) app.use(proxy);

  app.use((req, res) => {
    res.status(404).json(envelope(GATEWAY_MESSAGES.routeNotFound(req.method, req.path)));
  });

  const server = createServer(app);
{{#if CHAT}}
  // WebSocket upgrades (Socket.IO) are forwarded to the chat service.
  const websocket = proxies.find(p => p.ws)?.proxy;
  server.on('upgrade', (req, socket, head) => {
    if (websocket && req.url?.startsWith('/socket.io')) websocket.upgrade(req, socket as Socket, head);
    else socket.destroy();
  });
{{/if}}
  return server;
}
