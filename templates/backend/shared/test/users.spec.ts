import { createHarness } from '../support/harness.js';

describe('users', () => {
  let h: ReturnType<typeof createHarness>;

  const seed = (email: string) =>
    h.usersRepository.create({ email, name: email.split('@')[0] ?? email{{#if AUTH}}, passwordHash: 'hash'{{/if}} });

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

  it('updates the own profile', async () => {
    const user = await seed('user@example.com');
    expect((await h.users.updateProfile(user.id, { name: '  New Name ' })).name).toBe('New Name');
  });
{{else}}

  it('creates, updates and deletes a user', async () => {
    const user = await h.users.create({ email: 'New@Example.com', name: 'New' });
    expect(user.email).toBe('new@example.com');
    expect((await h.users.update(user.id, { name: 'Renamed' })).name).toBe('Renamed');
    await h.users.delete(user.id);
    await expect(h.users.getById(user.id)).rejects.toMatchObject({ statusCode: 404 });
  });
{{/if}}
});
