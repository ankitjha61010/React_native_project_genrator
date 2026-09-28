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
    expect(res.body.data).toMatchObject({ title: 'Bob', isGroup: false, participants: [{ id: bob.id, isOnline: true }] });
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
});
