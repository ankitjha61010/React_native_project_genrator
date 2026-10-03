import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { NextFunction, Request, Response } from 'express';
import { config } from '{{IMPORT:config.env}}';

/**
 * Development page to try {{#if CHAT}}chat{{/if}}{{#if CHAT}}{{#if CALLING}} and {{/if}}{{/if}}{{#if CALLING}}calls{{/if}} end to end without the app: open
 * http://localhost:<PORT>/tester in two browser tabs, sign in as two users (README "Chat & call tester").
 * The page lives in tester/ and talks to the real API + Socket.IO server. Not mounted in production.
 */
const FILES: Record<string, { file: string; type: string }> = {
  '/': { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/index.html': { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/tester.js': { file: 'tester.js', type: 'text/javascript; charset=utf-8' },
  '/tester.css': { file: 'tester.css', type: 'text/css; charset=utf-8' },
};

/**
 * The page's own Content-Security-Policy: its scripts come from this server{{#if CALLING}} and the Agora Web SDK
 * from jsDelivr (Agora media servers over https / wss){{else}}{{#if API_ENCRYPTION}} and crypto-js from jsDelivr{{/if}}{{/if}}.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "connect-src 'self' https: wss: ws:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "frame-ancestors 'self'",
].join('; ');

/** `app.use('/tester', testerPage)` – serves tester/*.html|js|css and the page's settings. */
export function testerPage(req: Request, res: Response, next: NextFunction): void {
  if (req.method !== 'GET') return next();
  // `/tester` → `/tester/`, so the page's relative tester.css / tester.js resolve under /tester/.
  const [pathname, query] = req.originalUrl.split('?');
  if (pathname === req.baseUrl) return res.redirect(302, `${req.baseUrl}/${query ? `?${query}` : ''}`);
  if (req.path === '/config.json') {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      apiBase: config.api.basePath,
{{#if API_ENCRYPTION}}
      // Same key / IV as the app bundle – the page encrypts its requests like the app does.
      encryption: config.encryption.enabled ? { key: config.encryption.key, iv: config.encryption.iv } : null,
{{else}}
      encryption: null,
{{/if}}
    });
    return;
  }
  const entry = FILES[req.path];
  if (!entry) return next();
  readFile(path.join('tester', entry.file)).then(body => {
    res.setHeader('Content-Security-Policy', CSP);
    res.setHeader('Cache-Control', 'no-cache');
    res.type(entry.type).send(body);
  }, next);
}
