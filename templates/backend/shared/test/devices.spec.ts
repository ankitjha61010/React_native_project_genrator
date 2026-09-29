import { createHarness, type Harness } from '../support/test-infrastructure.js';

describe('devices', () => {
  let h: Harness;
  let jane: string;
  let john: string;

  beforeEach(async () => {
    h = createHarness();
    jane = (await h.repositories.users.create({ email: 'jane@example.com', name: 'Jane' })).id;
    john = (await h.repositories.users.create({ email: 'john@example.com', name: 'John' })).id;
  });

  it('keeps one row per install and updates it on every registration', async () => {
    const first = await h.devices.register(jane, { deviceId: 'install-1', token: 'token-a', platform: 'android', deviceName: 'Pixel 8', osVersion: '15', appVersion: '1.0.0' });
    expect(first).toMatchObject({ deviceId: 'install-1', deviceName: 'Pixel 8', pushEnabled: true });

    await h.devices.register(jane, { deviceId: 'install-1', token: 'token-b', platform: 'android', appVersion: '1.1.0' });
    const devices = await h.devices.list(jane);
    expect(devices).toEqual([expect.objectContaining({ deviceId: 'install-1', appVersion: '1.1.0' })]);
    expect(await h.devices.tokensOf([jane])).toEqual(['token-b']);
  });

  it('supports several devices per user', async () => {
    await h.devices.register(jane, { deviceId: 'phone', token: 'token-phone', platform: 'android' });
    await h.devices.register(jane, { deviceId: 'tablet', token: 'token-tablet', platform: 'ios' });
    expect((await h.devices.list(jane)).map(d => d.deviceId).toSorted()).toEqual(['phone', 'tablet']);
  });

  it('gives a shared install to the user who signed in last', async () => {
    await h.devices.register(jane, { deviceId: 'shared', token: 'token-shared', platform: 'ios' });
    await h.devices.register(john, { deviceId: 'shared', token: 'token-shared', platform: 'ios' });
    expect(await h.devices.list(jane)).toHaveLength(0);
    expect(await h.devices.tokensOf([john])).toEqual(['token-shared']);
  });

  it('moves a token that shows up on another install', async () => {
    await h.devices.register(jane, { deviceId: 'old-install', token: 'token-x', platform: 'android' });
    await h.devices.register(jane, { deviceId: 'new-install', token: 'token-x', platform: 'android' });
    expect(await h.devices.tokensOf([jane])).toEqual(['token-x']);
    expect((await h.devices.list(jane)).find(d => d.deviceId === 'old-install')?.pushEnabled).toBe(false);
  });

  it('removes a device on logout, and invalid tokens after a push', async () => {
    await h.devices.register(jane, { deviceId: 'phone', token: 'token-phone', platform: 'android' });
    await expect(h.devices.remove(john, 'phone')).rejects.toMatchObject({ code: 'DEVICE_NOT_FOUND' });
    await h.devices.remove(jane, 'phone');
    expect(await h.devices.list(jane)).toHaveLength(0);

    await h.devices.register(jane, { deviceId: 'tablet', token: 'stale', platform: 'ios' });
    await h.devices.removeInvalidTokens(['stale']);
    expect(await h.devices.list(jane)).toHaveLength(0);
  });
});
