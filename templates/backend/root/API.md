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
{ "success": false, "message": "Validation failed", "data": null, "code": "VALIDATION_ERROR", "errors": [{ "field": "email", "message": "must be a valid email" }] }
```

Every route answers in one of these two shapes. Use `code` in the app (stable), show `message` to the user.
The texts live in the backend's messages files (`<feature>.messages.ts`, shared ones in `messages.ts`) – change them there. Common codes: `VALIDATION_ERROR` (422),
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
  "location": "Pune", "bio": "…", "role": "USER", "emailVerified": true, "phoneVerified": false, "hasPassword": true,
  "createdAt": "2026-01-01T00:00:00.000Z", "updatedAt": "…" }
```

Every sign-in endpoint returns a **session**:

```json
{ "user": User, "tokens": { "tokenType": "Bearer", "accessToken": "…", "expiresIn": 900, "accessTokenExpiresAt": "…"{{#if AUTH_REFRESH}}, "refreshToken": "…", "refreshTokenExpiresAt": "…"{{/if}} }{{#if PASSWORDLESS}}, "isNewUser": true{{/if}} }
```

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
{{#if AUTH_EMAIL}}
| POST | `/auth/register` | `name, email, password, countryCode?, phone?{{#if DEVICE_INPUT}}, device?{{/if}}` | session (201) – a verification code is emailed |
| POST | `/auth/login` | `email, password{{#if DEVICE_INPUT}}, device?{{/if}}` | session |
| POST | `/auth/forgot-password` | `email` | – (always 200) – a 6-digit code is emailed |
| POST | `/auth/reset-password` | `email, code, newPassword` | – |
| POST | `/auth/change-password` 🔒 | `currentPassword?, newPassword` | session (other devices are signed out) |
| POST | `/auth/verify-email/request` 🔒 | – | `{ expiresIn, resendIn }` |
| POST | `/auth/verify-email` 🔒 | `code` | User |
{{/if}}
{{#if AUTH_OTP}}
| POST | `/auth/otp/send` | `countryCode, phone` | `{ expiresIn, resendIn }` – SMS with a 6-digit code |
| POST | `/auth/otp/verify` | `countryCode, phone, otp, name?{{#if DEVICE_INPUT}}, device?{{/if}}` | session (`isNewUser: true` on the first login) |
{{/if}}
{{#if SOCIAL}}
| POST | `/auth/social` | `provider ({{SOCIAL_PROVIDER_LIST}}), token, tokenType, authorizationCode?, nonce?, name?{{#if DEVICE_INPUT}}, device?{{/if}}` | session |
{{/if}}
{{#if AUTH_REFRESH}}
| POST | `/auth/refresh` | `refreshToken{{#if DEVICE_INPUT}}, device?{{/if}}` | session{{#if AUTH_ROTATION}} (a **new** refresh token – store it; reusing an old one logs the user out){{/if}} |
| POST | `/auth/logout` | `refreshToken, deviceId?` | – {{#if DEVICE_INPUT}}(`deviceId`: that device is removed – no more pushes){{/if}} |
| POST | `/auth/logout-all` 🔒 | – | –{{#if DEVICE_INPUT}} (every device of the user is removed){{/if}} |
{{else}}
| POST | `/auth/logout` 🔒 | `deviceId?` | – (every token of the user stops working{{#if DEVICE_INPUT}}; `deviceId` is removed{{/if}}) |
{{/if}}
| GET | `/auth/me` 🔒 | – | User |

🔒 = needs `Authorization: Bearer`.
{{#if DEVICE_INPUT}}

**`device`** – this app install, saved while signing in (there is no separate "register device" request):

```json
{ "deviceId": "…generated once per install…", "deviceType": "ANDROID", "deviceModel": "Google Pixel 8", "osVersion": "15", "appVersion": "1.0.0", "fcmToken": "…" }
```

`deviceType`: `IOS` \| `ANDROID` \| `WEB`. `fcmToken` may be null (push not allowed yet). The same install always sends
the same `deviceId`; another user signing in on it takes it over, and an FCM token belongs to one install only.
{{/if}}
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
{{#if DELETE_ACCOUNT}}
| DELETE | `/users/me` 🔒 | – | – (the account and its data are deleted for good) |
{{/if}}
| GET | `/users/search?search=…&page=1&limit=20` 🔒 | – | `[{ id, name, avatar }]` + meta – other users A → Z (no `search`: everybody) |
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
{{#if GROUP_CHAT}}
Conversation { id, title, avatar?, isGroup, myRole: 'admin'|'member', unreadCount, lastMessage?: ChatMessage,
               participants: { id, name, avatar?, isOnline, lastSeen?, role }[], updatedAt }
{{else}}
Conversation { id, title, avatar?, unreadCount, lastMessage?: ChatMessage, participants: { id, name, avatar?, isOnline, lastSeen? }[], updatedAt }
{{/if}}
ChatMessage  { id, conversationId, senderId, senderName, senderAvatar?, type: 'text'|'image'|'video'|'audio'|'document'|'system',
               text?, mediaUrl?, thumbnailUrl?, fileName?, fileSize?, duration?, crop?,
               event?, actor?: { id, name }, target?: { id, name },          // system messages
               replyTo?: { messageId, senderId, senderName, type, text?, deleted? },
               createdAt, status: 'sent'|'read', isMe? }
```
{{#if GROUP_CHAT}}

**System messages** are written by the backend, never sent by the app – e.g. adding a member stores
`{ type: 'system', event: 'MEMBER_ADDED', actor: { id, name: 'Abhishek' }, target: { id, name: 'Rahul' }, createdAt }`
in the conversation ("Abhishek added Rahul"). They don't count as unread, can't be deleted or replied to, and are never pushed.
{{/if}}
{{#if CALLING}}

**Calls in the chat**: every finished one-to-one call is stored in the two people's direct chat as a system message
(the chat is created if needed): `{ type: 'system', event: 'CALL' | 'MISSED_CALL', text: 'audio' | 'video', duration?, actor: <caller>, target: <receiver> }`.
`CALL` was answered (`duration` = seconds talked); `MISSED_CALL` was not (missed, declined or cancelled). The app shows it
like WhatsApp ("Missed voice call", "Video call · 2:14") and calls back on tap.
{{/if}}

**Replies**: send `replyToId` with a message; the answer carries `replyTo` (the quote). When the original is deleted
the quote becomes `{ …, deleted: true }` without its text.

**Clearing** is always for the caller only: the other members keep their messages. "Clear chat" keeps the conversation
in your list; "Delete chat" also hides it until a new message arrives.

| Method | Path | Body / query | Returns |
| --- | --- | --- | --- |
| GET | `/chat/conversations` | – | Conversation[] (newest activity first) |
| POST | `/chat/conversations` | `participantIds: [otherUserId]` | Conversation (the direct chat is reused) |
| GET | `/chat/conversations/:id` | – | Conversation |
| DELETE | `/chat/conversations/:id` | – | – ("Delete chat": cleared and hidden until a new message{{#if GROUP_CHAT}}; a group: leave it{{/if}}) |
| POST | `/chat/conversations/:id/clear` | – | – ("Clear chat" – for you only, `chat:conversation_cleared` to your devices) |
| POST | `/chat/conversations/clear` | – | – ("Clear all chats" – for you only) |
| GET | `/chat/conversations/:id/messages?before=<messageId>&limit=30` | – | ChatMessage[] oldest → newest, `meta.hasMore` |
| POST | `/chat/conversations/:id/messages` | `type, text?, mediaUrl?, thumbnailUrl?, fileName?, fileSize?, duration?, crop?, replyToId?` | ChatMessage (201) |
| POST | `/chat/conversations/:id/read` | – | – |
| DELETE | `/chat/conversations/:id/messages/:messageId` | – | – (own messages only, for everyone) |
| POST | `/chat/upload` | multipart, field `file` | `{ url, type, fileName, fileSize, mimeType }` – send `url` as `mediaUrl` |
| POST | `/chat/upload-voice` | multipart, field `file` (audio) | same |
{{#if GROUP_CHAT}}
| POST | `/chat/groups` | `title, participantIds[], avatarUrl?` | Conversation (201) – you are the admin |
| PATCH | `/chat/groups/:id` | admin: `title?, avatarUrl?` | Conversation |
| POST | `/chat/groups/:id/members` | admin: `userIds[]` | Conversation |
| DELETE | `/chat/groups/:id/members/:userId` | admin | Conversation |
| PATCH | `/chat/groups/:id/members/:userId` | admin: `role: 'admin' \| 'member'` | Conversation |
| POST | `/chat/groups/:id/leave` | – | – (the last admin's role goes to the longest-standing member) |
{{/if}}

All chat routes need `Authorization: Bearer`.
{{/if}}
{{#if DEVICES}}

## Devices – `/devices`

One row per app install (the `devices` table); a user can have several devices. Pushes go to every device that has a
token. Devices are **saved by the sign-in requests** (their `device`, see Auth) and removed by logout – the app never
registers a device separately.

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| GET | `/devices` | – | `Device { deviceId, deviceType, deviceModel, osVersion, appVersion, pushEnabled, lastActiveAt, createdAt }[]` |
| PATCH | `/devices/:deviceId` | `fcmToken` | Device – only when FCM rotates the token of this install |
{{/if}}
{{#if NOTIFICATIONS}}

## Notifications – `/notifications`

`Notification { id, type: 'chat'|'order'|'promotion'|'account'|'general', title, body, data: Record<string, string>, read, createdAt }`

| Method | Path | Body / query | Returns |
| --- | --- | --- | --- |
| GET | `/notifications?page&limit` | – | Notification[] + meta (`meta.unreadCount`) |
| GET | `/notifications/unread-count` | – | `{ count }` |
| PATCH | `/notifications/:id/read` | – | – |
| POST | `/notifications/read-all` | – | – |
| DELETE | `/notifications/:id` · `/notifications` | – | – |
| POST | `/notifications/broadcast` | admin: `title, body, type?, audience?: all \| users \| admins, data?` | `{ id, recipientCount, … }` |
| GET | `/notifications/broadcasts?page&limit` | admin | broadcasts + meta |
| DELETE | `/notifications/broadcasts/:id` | admin – also removed from every recipient's inbox | – |
| DELETE | `/notifications/broadcasts` | admin – every broadcast and its inbox entries | `{ count }` |

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
{{#if GROUP_CHAT}}
| server → app | `chat:conversation_updated` | `{ conversationId, change, byUserId }` – reload the group |
| server → app | `chat:conversation_removed` | `{ conversationId }` – you left / were removed |
{{/if}}
{{/if}}
| server → app | `presence:user_online` / `presence:user_offline` | `{ userId, lastSeen? }` |
{{#if NOTIFICATIONS}}
| server → app | `notification:new` | Notification |
{{/if}}
{{/if}}
{{#if PAYMENTS}}

## Payments – `/payments`

The store (`/products`, `/me`{{#if GATEWAY}}, `/checkout`, `/:id/confirm`, `/history`{{/if}}{{#if IAP_NATIVE}}, `/iap/verify`{{/if}}{{#if IAP_ADAPTY}}, `/adapty/sync`{{/if}}), provider webhooks
(`/webhooks/…`, no token – signed) and the admin screens (`/admin/*`, permission `payments:manage`).
Every endpoint and key: [PAYMENTS.md](PAYMENTS.md).
{{/if}}
{{#if LEGAL}}

## Legal – `/legal` (public)

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/legal` | `{ termsUrl, privacyPolicyUrl{{#if DELETE_ACCOUNT}}, deleteAccountUrl{{/if}} }` – set `TERMS_URL` … in .env, or edit the pages in `public/` (served at `/terms-and-conditions`, `/privacy-policy`{{#if DELETE_ACCOUNT}}, `/delete-account`{{/if}}) |
{{/if}}
