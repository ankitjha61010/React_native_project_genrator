import { createHarness, type Harness } from '../support/test-infrastructure.js';

/** Lets the clock move on, so timestamps differ. */
const tick = () => new Promise(resolve => setTimeout(resolve, 3));

describe('chat', () => {
  let h: Harness;
  let alice: string;
  let bob: string;

  beforeEach(async () => {
    h = createHarness();
    alice = (await h.repositories.users.create({ email: 'alice@example.com', name: 'Alice' })).id;
    bob = (await h.repositories.users.create({ email: 'bob@example.com', name: 'Bob' })).id;
  });

  it('opens one direct conversation per pair, titled with the other person', async () => {
    const first = await h.chat.startConversation(alice, { participantIds: [bob] });
    const again = await h.chat.startConversation(alice, { participantIds: [bob] });

    expect(again.id).toBe(first.id);
    expect(first).toMatchObject({ title: 'Bob', {{#if GROUP_CHAT}}isGroup: false, {{/if}}unreadCount: 0, participants: [{ id: bob, name: 'Bob', isOnline: false }] });
    expect((await h.chat.getConversation(bob, first.id)).title).toBe('Alice');
  });

  it('delivers messages live, counts unread and marks read (read receipts)', async () => {
    const { id } = await h.chat.startConversation(alice, { participantIds: [bob] });
    const sent = await h.chat.sendMessage(alice, id, { type: 'text', text: ' Hi Bob ' });

    expect(sent).toMatchObject({ text: 'Hi Bob', senderName: 'Alice', status: 'sent', isMe: true });
    expect(h.realtime.eventsFor(bob, 'chat:receive_message')).toEqual([expect.objectContaining({ id: sent.id, conversationId: id })]);
    expect((await h.chat.listConversations(bob))[0]).toMatchObject({ unreadCount: 1, lastMessage: { text: 'Hi Bob', isMe: false } });

    await h.chat.markRead(bob, id);
    expect((await h.chat.listConversations(bob))[0]?.unreadCount).toBe(0);
    expect(h.realtime.eventsFor(alice, 'chat:message_read')).toHaveLength(1);
    expect((await h.chat.listMessages(alice, id, { limit: 30 })).items[0]?.status).toBe('read');
  });

  it('pages through messages oldest → newest', async () => {
    const { id } = await h.chat.startConversation(alice, { participantIds: [bob] });
    for (let i = 1; i <= 5; i++) {
      await h.chat.sendMessage(alice, id, { type: 'text', text: `m${i}` });
      await tick();
    }

    const latest = await h.chat.listMessages(bob, id, { limit: 2 });
    expect(latest.items.map(m => m.text)).toEqual(['m4', 'm5']);
    expect(latest.hasMore).toBe(true);
    const older = await h.chat.listMessages(bob, id, { before: latest.items[0]?.id, limit: 10 });
    expect(older.items.map(m => m.text)).toEqual(['m1', 'm2', 'm3']);
    expect(older.hasMore).toBe(false);
  });

  it('keeps outsiders out', async () => {
    const eve = (await h.repositories.users.create({ email: 'eve@example.com', name: 'Eve' })).id;
    const { id } = await h.chat.startConversation(alice, { participantIds: [bob] });
    await expect(h.chat.listMessages(eve, id, { limit: 10 })).rejects.toMatchObject({ statusCode: 404 });
    await expect(h.chat.sendMessage(eve, id, { type: 'text', text: 'hi' })).rejects.toMatchObject({ statusCode: 404 });
    expect(await h.chat.isMember(eve, id)).toBe(false);
  });

  it('validates messages: media must be uploaded first', async () => {
    const { id } = await h.chat.startConversation(alice, { participantIds: [bob] });
    await expect(h.chat.sendMessage(alice, id, { type: 'text', text: '   ' })).rejects.toMatchObject({ code: 'EMPTY_MESSAGE' });
    await expect(h.chat.sendMessage(alice, id, { type: 'image' })).rejects.toMatchObject({ code: 'MEDIA_REQUIRED' });

    const media = await h.chat.uploadMedia(alice, { buffer: Buffer.alloc(2048), originalName: 'cat.jpg', mimeType: 'image/jpeg', size: 2048 });
    expect(media).toMatchObject({ type: 'image', fileSize: '2.0 KB' });
    const photo = await h.chat.sendMessage(alice, id, { type: 'image', mediaUrl: media.url, crop: { width: 100, height: 100, aspectRatio: '1:1' } });
    expect(photo).toMatchObject({ type: 'image', mediaUrl: media.url, crop: { aspectRatio: '1:1' } });
    await expect(h.chat.uploadMedia(alice, { buffer: Buffer.alloc(1), originalName: 'x.exe', mimeType: 'application/x-msdownload', size: 1 })).rejects.toMatchObject({ code: 'INVALID_FILE_TYPE' });
  });

  it('lets senders delete their own messages only', async () => {
    const { id } = await h.chat.startConversation(alice, { participantIds: [bob] });
    const sent = await h.chat.sendMessage(alice, id, { type: 'text', text: 'oops' });

    await expect(h.chat.deleteMessage(bob, id, sent.id)).rejects.toMatchObject({ statusCode: 403 });
    await h.chat.deleteMessage(alice, id, sent.id);
    expect((await h.chat.listMessages(bob, id, { limit: 10 })).items).toHaveLength(0);
    expect(h.realtime.eventsFor(bob, 'chat:message_deleted')).toEqual([{ conversationId: id, messageId: sent.id }]);
  });

  it('hides a deleted direct chat until a new message arrives', async () => {
    const { id } = await h.chat.startConversation(alice, { participantIds: [bob] });
    await h.chat.sendMessage(alice, id, { type: 'text', text: 'old' });
    await tick();
    await h.chat.deleteConversation(bob, id);
    expect(await h.chat.listConversations(bob)).toHaveLength(0);

    await tick();
    await h.chat.sendMessage(alice, id, { type: 'text', text: 'new' });
    const [conversation] = await h.chat.listConversations(bob);
    expect(conversation?.unreadCount).toBe(1);
    expect((await h.chat.listMessages(bob, id, { limit: 10 })).items.map(m => m.text)).toEqual(['new']);
  });

  it('opens direct chats with exactly one other person', async () => {
    await expect(h.chat.startConversation(alice, { participantIds: [alice] })).rejects.toMatchObject({ code: 'NO_PARTICIPANTS' });
    const eve = (await h.repositories.users.create({ email: 'eve@example.com', name: 'Eve' })).id;
    await expect(h.chat.startConversation(alice, { participantIds: [bob, eve] })).rejects.toMatchObject({ code: 'TOO_MANY_PARTICIPANTS' });
    await expect(h.chat.startConversation(alice, { participantIds: ['missing'] })).rejects.toMatchObject({ statusCode: 404 });
  });
{{#if GROUP_CHAT}}

  describe('groups', () => {
    let carol: string;

    beforeEach(async () => {
      carol = (await h.repositories.users.create({ email: 'carol@example.com', name: 'Carol' })).id;
    });

    it('creates a group with the creator as admin and tells the members', async () => {
      await expect(h.chat.createGroup(alice, { title: '  ', participantIds: [bob] })).rejects.toMatchObject({ code: 'TITLE_REQUIRED' });
      const group = await h.chat.createGroup(alice, { title: 'Team', participantIds: [bob, carol] });

      expect(group).toMatchObject({ title: 'Team', isGroup: true, myRole: 'admin' });
      expect(group.participants.map(p => p.role)).toEqual(['member', 'member']);
      expect((await h.chat.getConversation(bob, group.id)).myRole).toBe('member');
      expect(h.realtime.eventsFor(bob, 'chat:conversation_updated')).toEqual([{ conversationId: group.id, change: 'created', byUserId: alice }]);
    });

    it('lets only admins rename, add, remove and promote', async () => {
      const group = await h.chat.createGroup(alice, { title: 'Team', participantIds: [bob] });
      await expect(h.chat.updateGroup(bob, group.id, { title: 'Mine' })).rejects.toMatchObject({ code: 'ADMIN_ONLY' });
      await expect(h.chat.addMembers(bob, group.id, [carol])).rejects.toMatchObject({ statusCode: 403 });

      expect((await h.chat.updateGroup(alice, group.id, { title: 'Crew', avatarUrl: 'https://cdn.example.com/g.png' })).title).toBe('Crew');
      expect((await h.chat.addMembers(alice, group.id, [carol, bob])).participants).toHaveLength(2);
      await h.chat.setMemberRole(alice, group.id, bob, 'admin');
      expect((await h.chat.getConversation(bob, group.id)).myRole).toBe('admin');

      await expect(h.chat.removeMember(bob, group.id, bob)).rejects.toMatchObject({ code: 'USE_LEAVE' });
      await h.chat.removeMember(bob, group.id, carol);
      expect(h.realtime.eventsFor(carol, 'chat:conversation_removed')).toEqual([{ conversationId: group.id }]);
      await expect(h.chat.getConversation(carol, group.id)).rejects.toMatchObject({ statusCode: 404 });
    });

    it('hands the admin role to the longest-standing member when the last admin leaves', async () => {
      const group = await h.chat.createGroup(alice, { title: 'Team', participantIds: [bob, carol] });
      await h.chat.leaveGroup(alice, group.id);

      expect((await h.chat.getConversation(bob, group.id)).myRole).toBe('admin');
      expect((await h.chat.getConversation(carol, group.id)).myRole).toBe('member');
      expect(h.realtime.eventsFor(alice, 'chat:conversation_removed')).toHaveLength(1);
    });

    it('keeps an admin when the only admin steps down', async () => {
      const group = await h.chat.createGroup(alice, { title: 'Team', participantIds: [bob] });
      await h.chat.setMemberRole(alice, group.id, alice, 'member');
      // Alice is the longest-standing member, so she stays the admin.
      expect((await h.chat.getConversation(alice, group.id)).myRole).toBe('admin');
    });

    it('deletes the group when the last member leaves', async () => {
      const group = await h.chat.createGroup(alice, { title: 'Team', participantIds: [bob] });
      await h.chat.deleteConversation(alice, group.id);
      await h.chat.leaveGroup(bob, group.id);
      expect(await h.repositories.chat.findConversation(group.id)).toBeNull();
    });

    it('leaves every group before an account is deleted', async () => {
      const group = await h.chat.createGroup(alice, { title: 'Team', participantIds: [bob] });
      await h.chat.leaveAllGroups(alice);
      expect((await h.chat.getConversation(bob, group.id)).myRole).toBe('admin');
    });
  });
{{/if}}
{{#if NOTIFICATIONS}}

  it('pushes to members who are offline', async () => {
    await h.devices.register(bob, { deviceId: 'bob-phone-1', token: 'bob-device-token', platform: 'android' });
    const { id } = await h.chat.startConversation(alice, { participantIds: [bob] });
    await h.chat.sendMessage(alice, id, { type: 'text', text: 'Are you there?' });

    expect(h.pushSender.sent).toEqual([
      { tokens: ['bob-device-token'], message: expect.objectContaining({ title: 'Alice', body: 'Are you there?', data: expect.objectContaining({ type: 'chat', conversationId: id, senderName: 'Alice' }) }) },
    ]);

    h.realtime.online.add(bob);
    await h.chat.sendMessage(alice, id, { type: 'text', text: 'online now' });
    expect(h.pushSender.sent).toHaveLength(1);
  });
{{/if}}
});
