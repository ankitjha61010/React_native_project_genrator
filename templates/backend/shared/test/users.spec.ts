import { createHarness, type Harness } from '../support/test-infrastructure.js';

describe('users', () => {
  let h: Harness;

  const seed = (email: string) => h.repositories.users.create({ email, name: email.split('@')[0] ?? email });

  beforeEach(() => {
    h = createHarness();
  });

  it('paginates the user list', async () => {
    await seed('a@example.com');
    await seed('b@example.com');
    await seed('c@example.com');

    const page = await h.users.list({ page: 1, limit: 2 });
    expect(page.items).toHaveLength(2);
    expect(page.meta).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2, hasNextPage: true, hasPreviousPage: false });
  });

  it('throws NotFound for an unknown id', async () => {
    await expect(h.users.getById('missing')).rejects.toMatchObject({ statusCode: 404, code: 'USER_NOT_FOUND' });
  });
{{#if AUTH}}

  it('updates the profile; a new mobile number must be verified again', async () => {
    const user = await h.repositories.users.create({ email: 'jane@example.com', name: 'Jane', countryCode: '+91', phone: '9876543210', phoneVerifiedAt: new Date() });
    const updated = await h.users.updateProfile(user.id, { name: ' Jane D. ', location: 'Pune', bio: '', phone: '9000000001' });

    expect(updated).toMatchObject({ name: 'Jane D.', location: 'Pune', bio: null, countryCode: '+91', phone: '9000000001', phoneVerifiedAt: null });
  });

  it('does not let two accounts share a mobile number', async () => {
    await h.repositories.users.create({ email: 'a@example.com', name: 'A', countryCode: '+91', phone: '9876543210' });
    const b = await seed('b@example.com');
    await expect(h.users.updateProfile(b.id, { countryCode: '+91', phone: '98765-43210' })).rejects.toMatchObject({ statusCode: 409, code: 'PHONE_TAKEN' });
  });

  it('stores an avatar and deletes the previous one', async () => {
    const user = await seed('jane@example.com');
    const image = { buffer: Buffer.from('img'), originalName: 'me.png', mimeType: 'image/png', size: 3 };

    const first = await h.users.setAvatar(user.id, image);
    const second = await h.users.setAvatar(user.id, image);
    expect(second.avatarUrl).toMatch(/^http:\/\/localhost:3000\/uploads\/avatars\//);
    expect(h.storage.files.size).toBe(1);
    expect(first.avatarUrl).not.toBe(second.avatarUrl);

    await expect(h.users.setAvatar(user.id, { ...image, mimeType: 'application/pdf' })).rejects.toMatchObject({ code: 'INVALID_FILE_TYPE' });
  });

  it('lists other users A → Z, filtered by name and paginated', async () => {
    const me = await seed('me@example.com');
    await h.repositories.users.create({ email: 'zed@example.com', name: 'Zed' });
    await h.repositories.users.create({ email: 'ada@example.com', name: 'Ada Lovelace' });

    const all = await h.users.search(me.id, { page: 1, limit: 1 });
    expect(all.items).toEqual([expect.objectContaining({ name: 'Ada Lovelace' })]);
    expect(all.meta).toMatchObject({ total: 2, hasNextPage: true });
    expect((await h.users.search(me.id, { page: 2, limit: 1 })).items).toEqual([expect.objectContaining({ name: 'Zed' })]);
    expect((await h.users.search(me.id, { page: 1, limit: 10, search: 'ada' })).items).toHaveLength(1);
    expect((await h.users.search(me.id, { page: 1, limit: 10, search: 'me' })).items).toEqual([]);
  });

{{#if DELETE_ACCOUNT}}
  it('deletes the own account', async () => {
    const user = await seed('jane@example.com');
    await h.users.deleteAccount(user.id);
    expect(await h.repositories.users.findById(user.id)).toBeNull();
  });
{{/if}}

  it('signs the user out everywhere when an admin changes their role', async () => {
    const admin = await seed('admin@example.com');
    const user = await seed('user@example.com');

    const updated = await h.users.update(user.id, { role: 'admin' }, admin.id);
    expect(updated.role).toBe('admin');
    expect(updated.tokenVersion).toBe(user.tokenVersion + 1);
  });

  it('does not let admins demote, disable or delete themselves', async () => {
    const admin = await seed('admin@example.com');
    await expect(h.users.update(admin.id, { role: 'user' }, admin.id)).rejects.toMatchObject({ statusCode: 403 });
    await expect(h.users.update(admin.id, { isActive: false }, admin.id)).rejects.toMatchObject({ statusCode: 403 });
    await expect(h.users.delete(admin.id, admin.id)).rejects.toMatchObject({ statusCode: 403 });
  });
{{else}}

  it('creates users with a normalized email', async () => {
    const user = await h.users.create({ email: ' Ada@Example.com ', name: ' Ada ' });
    expect(user).toMatchObject({ email: 'ada@example.com', name: 'Ada' });
  });
{{/if}}
});
