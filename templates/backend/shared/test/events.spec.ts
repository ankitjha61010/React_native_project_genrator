{{#if SVC_IDENTITY}}
{{#if DEVICE_EVENTS}}
import { logger } from '{{IMPORT:core.logger}}';
import { DeviceType } from '{{IMPORT:domain.device}}';
import { PublishingDeviceRegistry } from '{{IMPORT:events.usersPublisher}}';
{{/if}}
import { EVENT_CHANNELS } from '{{IMPORT:port.eventBus}}';
import { createHarness, type Harness } from '../support/test-infrastructure.js';

describe('identity service events', () => {
  let h: Harness;

  beforeEach(() => {
    h = createHarness();
  });

  it('publishes user changes without the password hash', async () => {
    const user = await h.infra.repositories.users.create({ email: 'jane@example.com', name: 'Jane', passwordHash: 'secret-hash' });
    await h.infra.repositories.users.update(user.id, { name: 'Jane D.' });
    await h.infra.repositories.users.delete(user.id);

    const events = h.eventBus.published.filter(e => e.channel === EVENT_CHANNELS.users).map(e => e.payload as { type: string; user?: { name: string; passwordHash: unknown } });
    expect(events.map(e => e.type)).toEqual(['user.upserted', 'user.upserted', 'user.deleted']);
    expect(events[1]?.user).toMatchObject({ name: 'Jane D.', passwordHash: null });
  });
{{#if DEVICE_EVENTS}}

  it('publishes the device of sign-ins and logouts (the notifications service stores it)', async () => {
    const devices = new PublishingDeviceRegistry(h.eventBus, logger);
    const device = { deviceId: 'jane-phone-1', deviceType: DeviceType.IOS, fcmToken: 'fcm-token-1' };
    await devices.save('u1', device);
    await devices.remove('u1', 'jane-phone-1');
    await devices.removeAll('u1');
    expect(h.eventBus.published.filter(e => e.channel === EVENT_CHANNELS.devices).map(e => e.payload)).toEqual([
      { type: 'device.saved', userId: 'u1', device },
      { type: 'device.removed', userId: 'u1', deviceId: 'jane-phone-1' },
      { type: 'device.removed', userId: 'u1' },
    ]);
  });
{{/if}}
});
{{/if}}
{{#if REPLICA}}
import { logger } from '{{IMPORT:core.logger}}';
{{#if SVC_NOTIFICATIONS}}
import { DeviceType } from '{{IMPORT:domain.device}}';
import { EventRealtime } from '{{IMPORT:events.realtime}}';
{{/if}}
import { EVENT_CHANNELS } from '{{IMPORT:port.eventBus}}';
import { startEventHandlers } from '{{IMPORT:events.handlers}}';
import { createHarness, type Harness } from '../support/test-infrastructure.js';
import { UserRole } from '{{IMPORT:domain.roles}}';

const identityUser = (id: string, name: string) => ({
  id,
  email: `${name.toLowerCase()}@example.com`,
  name,
  passwordHash: null,
  role: UserRole.USER,
  emailVerifiedAt: null,
  countryCode: null,
  phone: null,
  phoneVerifiedAt: null,
  avatarUrl: null,
  location: null,
  bio: null,
  isActive: true,
  tokenVersion: 0,
  lastLoginAt: null,
  lastSeenAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe('{{SERVICE_NAME}} service events', () => {
  let h: Harness;

  beforeEach(async () => {
    h = createHarness();
    await startEventHandlers(h.infra, h, logger);
  });

  it('keeps the local copy of the users in sync with the identity service', async () => {
    const id = '00000000-0000-4000-8000-000000000001';
    await h.eventBus.publish(EVENT_CHANNELS.users, { type: 'user.upserted', user: identityUser(id, 'Jane') });
    expect(await h.repositories.users.findById(id)).toMatchObject({ name: 'Jane', createdAt: expect.any(Date) });

    await h.eventBus.publish(EVENT_CHANNELS.users, { type: 'user.upserted', user: { ...identityUser(id, 'Jane'), name: 'Jane D.', tokenVersion: 3 } });
    expect(await h.repositories.users.findById(id)).toMatchObject({ name: 'Jane D.', tokenVersion: 3 });

    await h.eventBus.publish(EVENT_CHANNELS.users, { type: 'user.deleted', id });
    expect(await h.repositories.users.findById(id)).toBeNull();
    // Deleting twice is fine (events may repeat).
    await h.eventBus.publish(EVENT_CHANNELS.users, { type: 'user.deleted', id });
  });
{{#if SVC_CHAT}}

  it('delivers live events of other services to the connected apps', async () => {
    await h.eventBus.publish(EVENT_CHANNELS.realtime, { to: 'user', id: 'u1', event: 'notification:new', payload: { title: 'Hi' } });
    expect(h.realtime.eventsFor('u1', 'notification:new')).toEqual([{ title: 'Hi' }]);
  });
{{#if PUSH_EVENTS}}

  it('asks the notifications service to push to offline members', async () => {
    const alice = await h.repositories.users.create({ email: 'alice@example.com', name: 'Alice' });
    const bob = await h.repositories.users.create({ email: 'bob@example.com', name: 'Bob' });
    const { id } = await h.chat.startConversation(alice.id, { participantIds: [bob.id] });
    await h.chat.sendMessage(alice.id, id, { type: 'text', text: 'Hi Bob' });

    const push = h.eventBus.published.find(e => e.channel === EVENT_CHANNELS.push)?.payload as { userIds: string[]; message: { title: string } };
    expect(push).toMatchObject({ userIds: [bob.id], message: { title: 'Alice' } });
  });
{{/if}}
{{/if}}
{{#if SVC_NOTIFICATIONS}}

  it('pushes on behalf of other services', async () => {
    const user = await h.repositories.users.create({ email: 'jane@example.com', name: 'Jane' });
    await h.devices.save(user.id, { deviceId: 'jane-phone-1', fcmToken: 'device-token-1', deviceType: DeviceType.ANDROID });
    await h.eventBus.publish(EVENT_CHANNELS.push, { userIds: [user.id], message: { title: 'Alice', body: 'Hi', data: { type: 'chat' } } });
    expect(h.pushSender.sent).toEqual([{ tokens: ['device-token-1'], message: { title: 'Alice', body: 'Hi', data: { type: 'chat' } } }]);
  });

  it('stores and removes the devices the identity service publishes', async () => {
    const user = await h.repositories.users.create({ email: 'jane@example.com', name: 'Jane' });
    await h.eventBus.publish(EVENT_CHANNELS.devices, { type: 'device.saved', userId: user.id, device: { deviceId: 'jane-phone-1', deviceType: DeviceType.ANDROID, fcmToken: 'fcm-1' } });
    expect(await h.devices.list(user.id)).toEqual([expect.objectContaining({ deviceId: 'jane-phone-1', pushEnabled: true })]);
    await h.eventBus.publish(EVENT_CHANNELS.devices, { type: 'device.removed', userId: user.id, deviceId: 'jane-phone-1' });
    expect(await h.devices.list(user.id)).toHaveLength(0);
  });

  it('sends live events to the chat service (which holds the sockets)', async () => {
    new EventRealtime(h.eventBus).toUser('u1', 'notification:new', { title: 'Shipped' });
    await Promise.resolve();
    expect(h.eventBus.published).toContainEqual({ channel: EVENT_CHANNELS.realtime, payload: { to: 'user', id: 'u1', event: 'notification:new', payload: { title: 'Shipped' } } });
  });
{{/if}}
});
{{/if}}
