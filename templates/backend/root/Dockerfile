# Production image of the API.
#
#   docker build -t {{APP_SLUG}} .
#   docker run --env-file .env -e NODE_ENV=production -p {{PORT}}:{{PORT}} {{APP_SLUG}}
{{#if MICROSERVICE}}
#
# The root docker-compose.yml builds and starts every service with this file.
{{else}}
#
# Or with the database{{#if REDIS}} and Redis{{/if}}: `docker compose up -d --build` (see docker-compose.yml).
{{/if}}

# ── 1. Build: install everything, compile TypeScript, then drop the dev dependencies ──
FROM node:22-slim AS build
WORKDIR /app
{{#if PRISMA}}
# `prisma generate` (run by npm install) only needs *a* URL – it never connects.
ENV DATABASE_URL={{DATABASE_URL}}
COPY prisma ./prisma
COPY prisma.config.ts ./
{{/if}}
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
RUN npm run build && npm prune --omit=dev

# ── 2. Run: only the compiled app and its runtime dependencies ──
FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
{{#if LEGAL}}
# The legal pages (public/*.html).
COPY --from=build --chown=node:node /app/public ./public
{{/if}}
{{#if UPLOADS}}
# Uploaded files (mount a volume here so they survive new containers).
RUN mkdir uploads && chown node:node uploads
{{/if}}
USER node
EXPOSE {{PORT}}
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://localhost:{{PORT}}/api/v1/health').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "{{ENTRY_JS}}"]
