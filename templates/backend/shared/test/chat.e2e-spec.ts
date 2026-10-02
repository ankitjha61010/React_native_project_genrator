import request from 'supertest';
import type { Socket } from 'socket.io-client';
import { createTestApp, type TestApp } from '../support/test-app.js';

const api = '/api/v1';
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Resolves with the next payload of `event`. */
const next = <T>(socket: Socket, event: string) => new Promise<T>(resolve => socket.once(event, resolve));

describe('chat API + Socket.IO', () => {
  let app: TestApp;
  let alice: { id: string; token: string };
  let bob: { id: string; token: string };
  let bobSocket: Socket;
  let conversationId: string;

  beforeAll(async () => {
    app = await createTestApp();
    alice = await app.signUp('Alice');
    bob = await app.signUp('Bob');
    bobSocket = await app.socket(bob.token);
  });

  afterAll(async () => {
    bobSocket.disconnect();
    await app.close();
  });

  it('rejects sockets without a valid token', async () => {
    await expect(app.socket('not-a-token')).rejects.toThrow('UNAUTHORIZED');
  });

  it('POST /chat/conversations opens a direct chat', async () => {
    const res = await request(app.server).post(`${api}/chat/conversations`).set(bearer(alice.token)).send({ participantIds: [bob.id] }).expect(200);
    conversationId = res.body.data.id;
    // Bob is connected, so he shows as online.
    expect(res.body.data).toMatchObject({ title: 'Bob', {{#if GROUP_CHAT}}isGroup: false, {{/if}}participants: [{ id: bob.id, isOnline: true }] });
  });

  it('sends a message and delivers it live (chat:receive_message)', async () => {
    const received = next<{ id: string; text: string; conversationId: string }>(bobSocket, 'chat:receive_message');
    const res = await request(app.server).post(`${api}/chat/conversations/${conversationId}/messages`).set(bearer(alice.token)).send({ type: 'text', text: 'Hello Bob' }).expect(201);

    expect(res.body.data).toMatchObject({ text: 'Hello Bob', isMe: true, status: 'sent' });
    expect(await received).toMatchObject({ id: res.body.data.id, text: 'Hello Bob', conversationId });
  });

  it('lists conversations and messages for the other member', async () => {
    const list = await request(app.server).get(`${api}/chat/conversations`).set(bearer(bob.token)).expect(200);
    expect(list.body.data[0]).toMatchObject({ id: conversationId, title: 'Alice', unreadCount: 1, lastMessage: { text: 'Hello Bob', isMe: false } });

    const messages = await request(app.server).get(`${api}/chat/conversations/${conversationId}/messages`).set(bearer(bob.token)).expect(200);
    expect(messages.body.data).toHaveLength(1);
    expect(messages.body.meta).toEqual({ hasMore: false });
  });

  it('joins the room and relays typing to the other member', async () => {
    const aliceSocket = await app.socket(alice.token);
    const joined = await new Promise<{ ok: boolean }>(resolve => bobSocket.emit('chat:join_room', { roomId: conversationId }, resolve));
    expect(joined.ok).toBe(true);
    await new Promise<{ ok: boolean }>(resolve => aliceSocket.emit('chat:join_room', { roomId: conversationId }, resolve));

    const typing = next<{ roomId: string; userId: string }>(bobSocket, 'presence:typing');
    aliceSocket.emit('presence:typing', { roomId: conversationId });
    expect(await typing).toEqual({ roomId: conversationId, userId: alice.id, name: 'Alice' });
    aliceSocket.disconnect();
  });

  it('refuses to join a conversation you are not in', async () => {
    const eve = await app.signUp('Eve');
    const eveSocket = await app.socket(eve.token);
    const joined = await new Promise<{ ok: boolean }>(resolve => eveSocket.emit('chat:join_room', { roomId: conversationId }, resolve));
    expect(joined).toEqual({ ok: false, error: 'NOT_A_MEMBER' });
    eveSocket.disconnect();
    await request(app.server).get(`${api}/chat/conversations/${conversationId}/messages`).set(bearer(eve.token)).expect(404);
  });

  it('POST …/read marks read; the sender sees blue ticks', async () => {
    await request(app.server).post(`${api}/chat/conversations/${conversationId}/read`).set(bearer(bob.token)).expect(200);
    const messages = await request(app.server).get(`${api}/chat/conversations/${conversationId}/messages`).set(bearer(alice.token)).expect(200);
    expect(messages.body.data[0].status).toBe('read');
  });

  it('uploads media, then sends it', async () => {
    const upload = await request(app.server)
      .post(`${api}/chat/upload`)
      .set(bearer(alice.token))
      .attach('file', Buffer.alloc(1500), { filename: 'photo.jpg', contentType: 'image/jpeg' })
      .expect(201);
    expect(upload.body.data).toMatchObject({ type: 'image', fileName: 'photo.jpg', fileSize: '1.5 KB' });

    const sent = await request(app.server)
      .post(`${api}/chat/conversations/${conversationId}/messages`)
      .set(bearer(alice.token))
      .send({ type: 'image', mediaUrl: upload.body.data.url, crop: { width: 10, height: 10, aspectRatio: '1:1', filter: 'warm' } })
      .expect(201);
    expect(sent.body.data).toMatchObject({ type: 'image', mediaUrl: upload.body.data.url, crop: { filter: 'warm' } });

    await request(app.server).post(`${api}/chat/upload-voice`).set(bearer(alice.token)).attach('file', Buffer.alloc(10), { filename: 'x.jpg', contentType: 'image/jpeg' }).expect(400);
  });

  it('deletes a message for everyone', async () => {
    const sent = await request(app.server).post(`${api}/chat/conversations/${conversationId}/messages`).set(bearer(alice.token)).send({ type: 'text', text: 'oops' }).expect(201);
    const deleted = next<{ messageId: string }>(bobSocket, 'chat:message_deleted');
    await request(app.server).delete(`${api}/chat/conversations/${conversationId}/messages/${sent.body.data.id}`).set(bearer(bob.token)).expect(403);
    await request(app.server).delete(`${api}/chat/conversations/${conversationId}/messages/${sent.body.data.id}`).set(bearer(alice.token)).expect(200);
    expect((await deleted).messageId).toBe(sent.body.data.id);
  });

  it('replies to a message, clears a chat and all chats – for the caller only', async () => {
    const question = await request(app.server).post(`${api}/chat/conversations/${conversationId}/messages`).set(bearer(bob.token)).send({ type: 'text', text: 'Available today?' }).expect(201);
    const reply = await request(app.server)
      .post(`${api}/chat/conversations/${conversationId}/messages`)
      .set(bearer(alice.token))
      .send({ type: 'text', text: 'Yes', replyToId: question.body.data.id })
      .expect(201);
    expect(reply.body.data.replyTo).toMatchObject({ messageId: question.body.data.id, senderId: bob.id, text: 'Available today?' });
    await request(app.server).post(`${api}/chat/conversations/${conversationId}/messages`).set(bearer(alice.token)).send({ type: 'text', text: 'x', replyToId: 'missing' }).expect(404);

    await request(app.server).post(`${api}/chat/conversations/${conversationId}/clear`).set(bearer(alice.token)).expect(200);
    const mine = await request(app.server).get(`${api}/chat/conversations/${conversationId}/messages`).set(bearer(alice.token)).expect(200);
    expect(mine.body.data).toHaveLength(0);
    const theirs = await request(app.server).get(`${api}/chat/conversations/${conversationId}/messages`).set(bearer(bob.token)).expect(200);
    expect(theirs.body.data.length).toBeGreaterThan(0);

    await request(app.server).post(`${api}/chat/conversations/clear`).set(bearer(bob.token)).expect(200);
    const cleared = await request(app.server).get(`${api}/chat/conversations/${conversationId}/messages`).set(bearer(bob.token)).expect(200);
    expect(cleared.body.data).toHaveLength(0);
    const list = await request(app.server).get(`${api}/chat/conversations`).set(bearer(bob.token)).expect(200);
    expect(list.body.data.map((c: { id: string }) => c.id)).toContain(conversationId);
  });

  it('blocks someone: listed with name, no direct messages until unblocked', async () => {
    await request(app.server).post(`${api}/chat/users/${bob.id}/block`).set(bearer(alice.token)).expect(200);
    const list = await request(app.server).get(`${api}/chat/blocked-users`).set(bearer(alice.token)).expect(200);
    expect(list.body.data).toEqual([{ id: bob.id, name: 'Bob' }]);
    await request(app.server).post(`${api}/chat/conversations/${conversationId}/messages`).set(bearer(alice.token)).send({ type: 'text', text: 'Hi' }).expect(403);

    await request(app.server).post(`${api}/chat/users/${bob.id}/unblock`).set(bearer(alice.token)).expect(200);
    const after = await request(app.server).get(`${api}/chat/blocked-users`).set(bearer(alice.token)).expect(200);
    expect(after.body.data).toEqual([]);
  });

  it('broadcasts presence: offline (with lastSeen) when the last socket disconnects', async () => {
    const eve = await app.signUp('Eve');
    const online = next<{ userId: string }>(bobSocket, 'presence:user_online');
    const eveSocket = await app.socket(eve.token);
    expect((await online).userId).toBe(eve.id);

    const offline = next<{ userId: string; lastSeen: string }>(bobSocket, 'presence:user_offline');
    eveSocket.disconnect();
    expect(await offline).toMatchObject({ userId: eve.id, lastSeen: expect.any(String) });
  });
{{#if GROUP_CHAT}}

  it('creates and manages a group; members get live updates', async () => {
    const carol = await app.signUp('Carol');
    const updated = next<{ conversationId: string; change: string }>(bobSocket, 'chat:conversation_updated');
    const created = await request(app.server).post(`${api}/chat/groups`).set(bearer(alice.token)).send({ title: 'Team', participantIds: [bob.id, carol.id] }).expect(201);
    const groupId = created.body.data.id;
    expect(created.body.data).toMatchObject({ title: 'Team', isGroup: true, myRole: 'admin' });
    expect(await updated).toMatchObject({ conversationId: groupId, change: 'created' });

    // Any member may rename the group; adding / removing / promoting stays admin-only.
    await request(app.server).patch(`${api}/chat/groups/${groupId}`).set(bearer(bob.token)).send({ title: 'Mine' }).expect(200);
    const renamed = await request(app.server).patch(`${api}/chat/groups/${groupId}`).set(bearer(alice.token)).send({ title: 'Crew' }).expect(200);
    expect(renamed.body.data.title).toBe('Crew');

    await request(app.server).patch(`${api}/chat/groups/${groupId}/members/${bob.id}`).set(bearer(alice.token)).send({ role: 'admin' }).expect(200);
    await request(app.server).delete(`${api}/chat/groups/${groupId}/members/${carol.id}`).set(bearer(bob.token)).expect(200);
    await request(app.server).post(`${api}/chat/groups/${groupId}/members`).set(bearer(bob.token)).send({ userIds: [carol.id] }).expect(200);
    const messages = await request(app.server).get(`${api}/chat/conversations/${groupId}/messages`).set(bearer(carol.token)).expect(200);
    expect(messages.body.data.at(-1)).toMatchObject({ type: 'system', event: 'MEMBER_ADDED', actor: { id: bob.id, name: 'Bob' }, target: { id: carol.id, name: 'Carol' } });

    await request(app.server).post(`${api}/chat/groups/${groupId}/leave`).set(bearer(alice.token)).expect(200);
    const group = await request(app.server).get(`${api}/chat/conversations/${groupId}`).set(bearer(carol.token)).expect(200);
    expect(group.body.data.participants).toEqual([expect.objectContaining({ id: bob.id, role: 'admin' })]);
  });
{{/if}}
});
