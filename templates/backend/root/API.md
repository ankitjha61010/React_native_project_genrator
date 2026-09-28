# {{DISPLAY_NAME}} API – contract

Base URL: `http://<host>:3000/api/v1` (Android emulator: `http://10.0.2.2:3000/api/v1`).
{{#if SWAGGER}}
Interactive docs: `/api/docs` · OpenAPI 3 JSON: `/api/docs/openapi.json`.
{{/if}}

## Conventions

**Success** – every response:

```json
{ "success": true, "message": "Logged in successfully", "data": { … }, "meta": { … } }
```

`meta` appears on lists: `{ page, limit, total, totalPages, hasNextPage, hasPreviousPage }`.

**Error** – any 4xx / 5xx:

```json
{ "success": false, "message": "Validation failed", "code": "VALIDATION_ERROR", "errors": [{ "field": "email", "message": "must be a valid email" }] }
```

Use `code` in the app (stable), show `message` to the user. Common codes: `VALIDATION_ERROR` (422),
`UNAUTHORIZED` / `MISSING_TOKEN` / `TOKEN_EXPIRED` / `SESSION_REVOKED` (401), `FORBIDDEN` (403), `…_NOT_FOUND` (404),
`TOO_MANY_REQUESTS` (429).
{{#if AUTH}}

**Authentication** – send `Authorization: Bearer <accessToken>`.
{{#if AUTH_REFRESH}}
When a request answers `401`, call `POST /auth/refresh` with the refresh token once and retry.
{{/if}}
{{/if}}
{{#if API_ENCRYPTION}}

**Encryption** – when `API_ENCRYPTION_ENABLED=true`, JSON bodies in both directions are
`{ "data": "<base64 AES-256-CBC(JSON)>" }` with `API_ENCRYPTION_KEY` / `API_ENCRYPTION_IV` (the app's apiEncryption.ts
does this). Uploads (multipart) are not encrypted.
{{/if}}
{{#if AUTH}}

## Auth – `/auth`

The user object (`User`):

```json
{ "id": "…", "email": "jane@example.com", "name": "Jane", "avatar": "https://…/uploads/avatars/….jpg", "countryCode": "+91", "phone": "9876543210",
  "location": "Pune", "bio": "…", "role": "user", "emailVerified": true, "phoneVerified": false, "hasPassword": true,
  "createdAt": "2026-01-01T00:00:00.000Z", "updatedAt": "…" }
```

Every sign-in endpoint returns a **session**:

```json
{ "user": User, "tokens": { "tokenType": "Bearer", "accessToken": "…", "expiresIn": 900, "accessTokenExpiresAt": "…"{{#if AUTH_REFRESH}}, "refreshToken": "…", "refreshTokenExpiresAt": "…"{{/if}} }{{#if PASSWORDLESS}}, "isNewUser": true{{/if}} }
```

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
{{#if AUTH_EMAIL}}
| POST | `/auth/register` | `name, email, password, countryCode?, phone?` | session (201) – a verification code is emailed |
| POST | `/auth/login` | `email, password` | session |
| POST | `/auth/forgot-password` | `email` | – (always 200) – a 6-digit code is emailed |
| POST | `/auth/reset-password` | `email, code, newPassword` | – |
| POST | `/auth/change-password` 🔒 | `currentPassword?, newPassword` | session (other devices are signed out) |
| POST | `/auth/verify-email/request` 🔒 | – | `{ expiresIn, resendIn }` |
| POST | `/auth/verify-email` 🔒 | `code` | User |
{{/if}}
{{#if AUTH_OTP}}
| POST | `/auth/otp/send` | `countryCode, phone` | `{ expiresIn, resendIn }` – SMS with a 6-digit code |
| POST | `/auth/otp/verify` | `countryCode, phone, otp, name?` | session (`isNewUser: true` on the first login) |
{{/if}}
{{#if SOCIAL}}
| POST | `/auth/social` | `provider ({{SOCIAL_PROVIDER_LIST}}), token, tokenType, authorizationCode?, nonce?, name?` | session |
{{/if}}
{{#if AUTH_REFRESH}}
| POST | `/auth/refresh` | `refreshToken` | session{{#if AUTH_ROTATION}} (a **new** refresh token – store it; reusing an old one logs the user out){{/if}} |
| POST | `/auth/logout` | `refreshToken` | – |
| POST | `/auth/logout-all` 🔒 | – | – |
{{else}}
| POST | `/auth/logout` 🔒 | – | – (every token of the user stops working) |
{{/if}}
| GET | `/auth/me` 🔒 | – | User |

🔒 = needs `Authorization: Bearer`.
{{#if CODES}}

Codes are 6 digits, valid `VERIFICATION_CODE_TTL` (10 min), a new one can be requested after `resendIn` seconds
(`429 CODE_RESEND_TOO_SOON` before), and they die after 5 wrong tries (`400 INVALID_CODE`).
{{/if}}
{{#if SOCIAL}}

Social sign-in: send the token the provider SDK returned –
{{#if SOCIAL_GOOGLE}}
Google `{ provider: "google", token: idToken, tokenType: "idToken" }`,
{{/if}}
{{#if SOCIAL_FACEBOOK}}
Facebook `{ provider: "facebook", token: accessToken, tokenType: "accessToken" }` (iOS Limited Login: `authenticationToken`),
{{/if}}
{{#if SOCIAL_APPLE}}
Apple `{ provider: "apple", token: identityToken, tokenType: "identityToken", nonce, name }` (send `name` – Apple only gives it on the first sign-in).
{{/if}}
The server verifies it with the provider; an account with the same verified email is linked instead of duplicated.
{{/if}}
{{/if}}

## Users – `/users`

| Method | Path | Body / query | Returns |
| --- | --- | --- | --- |
{{#if AUTH}}
| PATCH | `/users/me` 🔒 | `name?, countryCode?, phone?, location?, bio?` (`phone: null` removes it) | User |
| POST | `/users/me/avatar` 🔒 | multipart, field `avatar` (JPEG / PNG / WebP / HEIC, ≤ `UPLOAD_MAX_MB`) | User |
| DELETE | `/users/me/avatar` 🔒 | – | User |
| DELETE | `/users/me` 🔒 | – | – (account and its data are deleted) |
| GET | `/users/search?q=…&limit=20` 🔒 | – | `[{ id, name, avatar }]` |
| GET | `/users?page&limit&search` | admin (`users:read`) | User[] + meta |
| GET / PATCH / DELETE | `/users/:id` | admin (`users:read` / `users:write` / `users:delete`) | User |
{{else}}
| GET | `/users?page&limit&search` | – | User[] + meta |
| POST | `/users` | `email, name` | User (201) |
| GET / PATCH / DELETE | `/users/:id` | `name?` | User |
{{/if}}
{{#if CHAT}}

## Chat – `/chat`

Shapes (same as the app's `chat/types/chat.ts`):

```ts
Conversation { id, title, avatar?, isGroup, unreadCount, lastMessage?: ChatMessage, participants: { id, name, avatar?, isOnline, lastSeen? }[], updatedAt }
ChatMessage  { id, conversationId, senderId, senderName, senderAvatar?, type: 'text'|'image'|'video'|'audio'|'document',
               text?, mediaUrl?, thumbnailUrl?, fileName?, fileSize?, duration?, crop?, createdAt, status: 'sent'|'read', isMe? }
```

| Method | Path | Body / query | Returns |
| --- | --- | --- | --- |
| GET | `/chat/conversations` | – | Conversation[] (newest activity first) |
| POST | `/chat/conversations` | `participantIds[], title?, isGroup?` | Conversation (a direct chat is reused) |
| GET | `/chat/conversations/:id` | – | Conversation |
| DELETE | `/chat/conversations/:id` | – | – (direct: hidden until a new message; group: leave) |
| GET | `/chat/conversations/:id/messages?before=<messageId>&limit=30` | – | ChatMessage[] oldest → newest, `meta.hasMore` |
| POST | `/chat/conversations/:id/messages` | `type, text?, mediaUrl?, thumbnailUrl?, fileName?, fileSize?, duration?, crop?` | ChatMessage (201) |
| POST | `/chat/conversations/:id/read` | – | – |
| DELETE | `/chat/conversations/:id/messages/:messageId` | – | – (own messages only) |
| POST | `/chat/upload` | multipart, field `file` | `{ url, type, fileName, fileSize, mimeType }` – send `url` as `mediaUrl` |
| POST | `/chat/upload-voice` | multipart, field `file` (audio) | same |

All chat routes need `Authorization: Bearer`.
{{/if}}
{{#if NOTIFICATIONS}}

## Notifications – `/notifications`

`Notification { id, type: 'chat'|'order'|'promotion'|'account'|'general', title, body, data: Record<string, string>, read, createdAt }`

| Method | Path | Body / query | Returns |
| --- | --- | --- | --- |
| POST | `/notifications/devices` | `token (FCM), platform: ios \| android \| web` | – (call after login and on token refresh) |
| DELETE | `/notifications/devices/:token` | – | – (call on logout) |
| GET | `/notifications?page&limit` | – | Notification[] + meta (`meta.unreadCount`) |
| GET | `/notifications/unread-count` | – | `{ count }` |
| PATCH | `/notifications/:id/read` | – | – |
| POST | `/notifications/read-all` | – | – |
| DELETE | `/notifications/:id` · `/notifications` | – | – |
| POST | `/notifications/broadcast` | admin: `title, body, type?, audience?: all \| users \| admins, data?` | `{ id, recipientCount, … }` |
| GET | `/notifications/broadcasts?page&limit` | admin | broadcasts + meta |

Push payload (FCM) – `notification: { title, body }` and `data` (strings): `type`, `notificationId` or `broadcastId`,
`sentAt`, your `data` keys (e.g. `url`){{#if CHAT}}; chat pushes add `conversationId`, `senderName`, `senderAvatar`{{/if}}.
{{/if}}
{{#if REALTIME}}

## Socket.IO (same host and port)

```js
io('http://<host>:3000', { transports: ['websocket'], auth: { token: accessToken } })
```

| Direction | Event | Payload |
| --- | --- | --- |
{{#if CHAT}}
| app → server | `chat:join_room` / `chat:leave_room` | `{ roomId: conversationId }` (ack `{ ok }`) |
| app → server | `presence:typing` / `presence:stop_typing` | `{ roomId }` |
| app → server | `chat:message_read` | `{ roomId }` |
| server → app | `chat:receive_message` | ChatMessage (to every member) |
| server → app | `chat:message_read` | `{ conversationId, userId, readAt }` |
| server → app | `chat:message_deleted` | `{ conversationId, messageId }` |
| server → app | `presence:typing` / `presence:stop_typing` | `{ roomId, userId, name }` |
{{/if}}
| server → app | `presence:user_online` / `presence:user_offline` | `{ userId, lastSeen? }` |
{{#if NOTIFICATIONS}}
| server → app | `notification:new` | Notification |
{{/if}}
{{/if}}
