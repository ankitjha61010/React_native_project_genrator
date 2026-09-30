import { DeviceType } from '{{IMPORT:domain.device}}';
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

  it('keeps one row per install and updates it on every sign-in', async () => {
    await h.devices.save(jane, { deviceId: 'install-1', fcmToken: 'token-a', deviceType: DeviceType.ANDROID, deviceModel: 'Pixel 8', osVersion: '15', appVersion: '1.0.0' });
    expect(await h.devices.list(jane)).toEqual([expect.objectContaining({ deviceId: 'install-1', deviceType: DeviceType.ANDROID, deviceModel: 'Pixel 8', pushEnabled: true })]);

    await h.devices.save(jane, { deviceId: 'install-1', fcmToken: 'token-b', deviceType: DeviceType.ANDROID, appVersion: '1.1.0' });
    expect(await h.devices.list(jane)).toEqual([expect.objectContaining({ deviceId: 'install-1', appVersion: '1.1.0' })]);
    expect(await h.devices.tokensOf([jane])).toEqual(['token-b']);
  });

  it('supports several devices per user', async () => {
    await h.devices.save(jane, { deviceId: 'phone', fcmToken: 'token-phone', deviceType: DeviceType.ANDROID });
    await h.devices.save(jane, { deviceId: 'tablet', fcmToken: 'token-tablet', deviceType: DeviceType.IOS });
    expect((await h.devices.list(jane)).map(d => d.deviceId).toSorted()).toEqual(['phone', 'tablet']);
  });

  it('gives a shared install to the user who signed in last', async () => {
    await h.devices.save(jane, { deviceId: 'shared', fcmToken: 'token-shared', deviceType: DeviceType.IOS });
    await h.devices.save(john, { deviceId: 'shared', fcmToken: 'token-shared', deviceType: DeviceType.IOS });
    expect(await h.devices.list(jane)).toHaveLength(0);
    expect(await h.devices.tokensOf([john])).toEqual(['token-shared']);
  });

  it('moves a token that shows up on another install', async () => {
    await h.devices.save(jane, { deviceId: 'old-install', fcmToken: 'token-x', deviceType: DeviceType.ANDROID });
    await h.devices.save(jane, { deviceId: 'new-install', fcmToken: 'token-x', deviceType: DeviceType.ANDROID });
    expect(await h.devices.tokensOf([jane])).toEqual(['token-x']);
    expect((await h.devices.list(jane)).find(d => d.deviceId === 'old-install')?.pushEnabled).toBe(false);
  });

  it('updates a rotated FCM token – only on your own device', async () => {
    await h.devices.save(jane, { deviceId: 'phone', fcmToken: 'token-old', deviceType: DeviceType.ANDROID });
    await expect(h.devices.updateFcmToken(john, 'phone', 'token-new')).rejects.toMatchObject({ code: 'DEVICE_NOT_FOUND' });
    expect(await h.devices.updateFcmToken(jane, 'phone', 'token-new')).toMatchObject({ deviceId: 'phone', pushEnabled: true });
    expect(await h.devices.tokensOf([jane])).toEqual(['token-new']);
  });

  it('removes a device on logout, all of them on "sign out everywhere", and invalid tokens after a push', async () => {
    await h.devices.save(jane, { deviceId: 'phone', fcmToken: 'token-phone', deviceType: DeviceType.ANDROID });
    await h.devices.remove(john, 'phone');
    expect(await h.devices.list(jane)).toHaveLength(1);
    await h.devices.remove(jane, 'phone');
    expect(await h.devices.list(jane)).toHaveLength(0);

    await h.devices.save(jane, { deviceId: 'phone', deviceType: DeviceType.ANDROID });
    await h.devices.save(jane, { deviceId: 'tablet', deviceType: DeviceType.IOS });
    await h.devices.removeAll(jane);
    expect(await h.devices.list(jane)).toHaveLength(0);

    await h.devices.save(jane, { deviceId: 'tablet', fcmToken: 'stale', deviceType: DeviceType.IOS });
    await h.devices.removeInvalidTokens(['stale']);
    expect(await h.devices.list(jane)).toHaveLength(0);
  });
});
