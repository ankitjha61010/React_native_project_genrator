import { createHarness, type Harness } from '../support/test-infrastructure.js';

const tick = () => new Promise(resolve => setTimeout(resolve, 3));

describe('notifications', () => {
  let h: Harness;
  let userId: string;

  beforeEach(async () => {
    h = createHarness();
    userId = (await h.repositories.users.create({ email: 'jane@example.com', name: 'Jane' })).id;
  });

  it('notifies: inbox entry, live event and push', async () => {
    await h.devices.register(userId, { deviceId: 'install-1', token: 'token-1', platform: 'ios' });
    const view = await h.notifications.notify(userId, { type: 'order', title: 'Shipped', body: 'Your order is on its way', data: { url: 'https://example.com/o/1' } });

    expect(view).toMatchObject({ type: 'order', read: false, data: { url: 'https://example.com/o/1' } });
    expect(h.realtime.eventsFor(userId, 'notification:new')).toEqual([view]);
    expect(h.pushSender.sent[0]?.message.data).toMatchObject({ type: 'order', notificationId: view.id, url: 'https://example.com/o/1' });
  });

  it('lists with unread count, marks read and deletes', async () => {
    const a = await h.notifications.notify(userId, { title: 'A', body: 'a' });
    await tick();
    await h.notifications.notify(userId, { title: 'B', body: 'b' });

    let { page, unreadCount } = await h.notifications.list(userId, { page: 1, limit: 10 });
    expect(page.items.map(n => n.title)).toEqual(['B', 'A']);
    expect(unreadCount).toBe(2);

    await h.notifications.markRead(userId, a.id);
    expect(await h.notifications.unreadCount(userId)).toBe(1);
    await h.notifications.markAllRead(userId);
    ({ unreadCount } = await h.notifications.list(userId, { page: 1, limit: 10 }));
    expect(unreadCount).toBe(0);

    await h.notifications.delete(userId, a.id);
    await expect(h.notifications.delete(userId, a.id)).rejects.toMatchObject({ statusCode: 404 });
    await h.notifications.clear(userId);
    ({ page } = await h.notifications.list(userId, { page: 1, limit: 10 }));
    expect(page.items).toHaveLength(0);
  });

  it("can't touch other users' notifications", async () => {
    const other = (await h.repositories.users.create({ email: 'x@example.com', name: 'X' })).id;
    const mine = await h.notifications.notify(userId, { title: 'Mine', body: '…' });
    await expect(h.notifications.markRead(other, mine.id)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('broadcasts to an audience and records it', async () => {
    const admin = await h.repositories.users.create({ email: 'admin@example.com', name: 'Admin', role: 'admin' });
    await h.devices.register(userId, { deviceId: 'install-user', token: 'token-user', platform: 'android' });
    await h.devices.register(admin.id, { deviceId: 'install-admin', token: 'token-admin', platform: 'android' });

    const all = await h.notifications.broadcast(admin.id, { title: 'Maintenance', body: 'Tonight 2am', type: 'general' });
    expect(all.recipientCount).toBe(2);
    expect(h.pushSender.sent.at(-1)?.tokens.toSorted()).toEqual(['token-admin', 'token-user']);
    expect(await h.notifications.unreadCount(userId)).toBe(1);

    const admins = await h.notifications.broadcast(admin.id, { title: 'Admins only', body: '…', audience: 'admins' });
    expect(admins.recipientCount).toBe(1);
    expect((await h.notifications.listBroadcasts({ page: 1, limit: 10 })).meta.total).toBe(2);
  });

  it('forgets devices FCM rejects', async () => {
    await h.devices.register(userId, { deviceId: 'install-1', token: 'stale-token', platform: 'android' });
    h.pushSender.invalid = ['stale-token'];
    await h.notifications.notify(userId, { title: 'Hi', body: '…' });
    expect(h.repositories.devices.devices).toHaveLength(0);
  });

  it('pushes to every device of the user', async () => {
    await h.devices.register(userId, { deviceId: 'phone', token: 'token-phone', platform: 'android' });
    await h.devices.register(userId, { deviceId: 'tablet', token: 'token-tablet', platform: 'ios' });
    await h.devices.register(userId, { deviceId: 'no-push', platform: 'ios' });
    await h.notifications.notify(userId, { title: 'Hi', body: '…' });
    expect(h.pushSender.sent[0]?.tokens.toSorted()).toEqual(['token-phone', 'token-tablet']);
  });
});
