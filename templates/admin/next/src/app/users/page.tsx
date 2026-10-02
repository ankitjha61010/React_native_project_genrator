'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Search, Shield, CheckCircle2, XCircle, Trash2, Edit3,
  RefreshCw, ToggleLeft, ToggleRight, AlertTriangle, X, Upload, Image,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Header } from '../../components/Header';
import type { User, UserRole } from '../../types';

// ── Reusable confirm modal ─────────────────────────────────────────────────────
function ConfirmModal({
  title, message, confirmLabel = 'Confirm', danger = false,
  onConfirm, onCancel,
}: {
  title: string; message: string; confirmLabel?: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-start space-x-3 mb-4">
          <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${danger ? 'text-rose-400' : 'text-amber-400'}`} />
          <div>
            <h3 className="font-bold text-white text-base">{title}</h3>
            <p className="text-sm text-slate-400 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex justify-end space-x-3">
          <button onClick={onCancel} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl transition-all">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white text-sm font-semibold rounded-xl transition-all shadow-lg ${
              danger
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'BANNED'>('ALL');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Edit modal
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCountryCode, setEditCountryCode] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('USER');
  const [editActive, setEditActive] = useState(true);
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);

  // Confirm modal
  const [confirm, setConfirm] = useState<{
    title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    if (!authLoading && (!currentUser || currentUser.role !== 'ADMIN')) router.push('/login');
  }, [currentUser, authLoading, router]);

  const fetchUsers = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await api.get('/users?limit=100');
      const payload = res.data?.data || res.data;
      const list = Array.isArray(payload) ? payload : (payload?.items ?? []);
      setUsers(list);
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'ADMIN') fetchUsers();
  }, [currentUser]);

  const openEdit = (u: User) => {
    setEditUser(u);
    setEditName(u.name || '');
    setEditEmail(u.email || '');
    setEditCountryCode(u.countryCode || '');
    setEditPhone(u.phone || '');
    setEditRole(u.role);
    setEditActive(u.isActive ?? true);
    setEditAvatarUrl(u.avatar || '');
    setAvatarPreview(u.avatar || null);
    setActionError(null);
  };

  // Upload avatar from local file → send as URL via multipart to /users/:id/avatar or embed as data URL
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editUser) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await api.post(`/users/${editUser.id}/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updated: User = res.data?.data?.user ?? res.data?.data ?? res.data;
      const newUrl = updated?.avatar || URL.createObjectURL(file);
      setAvatarPreview(newUrl);
      setEditAvatarUrl(newUrl);
      setActionSuccess('Avatar uploaded successfully');
    } catch {
      // Fallback: preview locally and save URL on edit submit
      const localUrl = URL.createObjectURL(file);
      setAvatarPreview(localUrl);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const patch: Record<string, unknown> = {};
      if (editName.trim() && editName.trim() !== editUser.name) patch.name = editName.trim();
      if (editEmail.trim() !== (editUser.email ?? '')) patch.email = editEmail.trim() || null;
      if (editCountryCode.trim() !== (editUser.countryCode ?? '')) patch.countryCode = editCountryCode.trim() || null;
      if (editPhone.trim() !== (editUser.phone ?? '')) patch.phone = editPhone.trim() || null;
      if (editRole !== editUser.role) patch.role = editRole;
      if (editActive !== (editUser.isActive ?? true)) patch.isActive = editActive;
      if (editAvatarUrl && editAvatarUrl !== editUser.avatar) patch.avatarUrl = editAvatarUrl;

      if (Object.keys(patch).length === 0) { setEditUser(null); return; }
      await api.patch(`/users/${editUser.id}`, patch);
      setActionSuccess('User updated successfully');
      setEditUser(null);
      fetchUsers();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusToggle = (targetUser: User) => {
    if (targetUser.id === currentUser?.id) {
      setActionError('You cannot ban your own account.');
      return;
    }
    const isActive = targetUser.isActive ?? true;
    setConfirm({
      title: isActive ? 'Ban Account' : 'Activate Account',
      message: `Are you sure you want to ${isActive ? 'ban' : 'activate'} ${targetUser.name}?`,
      confirmLabel: isActive ? 'Ban User' : 'Activate',
      danger: isActive,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await api.patch(`/users/${targetUser.id}`, { isActive: !isActive });
          setActionSuccess(`Account ${!isActive ? 'activated' : 'banned'} successfully`);
          fetchUsers();
        } catch (err: any) {
          setActionError(err?.response?.data?.message || 'Failed to update status');
        }
      },
    });
  };

  const handleRoleToggle = (targetUser: User) => {
    if (targetUser.id === currentUser?.id) {
      setActionError('You cannot change your own role.');
      return;
    }
    const newRole: UserRole = targetUser.role === 'ADMIN' ? 'USER' : 'ADMIN';
    setConfirm({
      title: 'Change Role',
      message: `Change ${targetUser.name}'s role to ${newRole}?`,
      confirmLabel: `Set ${newRole}`,
      danger: false,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await api.patch(`/users/${targetUser.id}`, { role: newRole });
          setActionSuccess(`Role updated to ${newRole}`);
          fetchUsers();
        } catch (err: any) {
          setActionError(err?.response?.data?.message || 'Failed to update role');
        }
      },
    });
  };

  const handleDeleteUser = (targetUser: User) => {
    if (targetUser.id === currentUser?.id) {
      setActionError('You cannot delete your own account.');
      return;
    }
    setConfirm({
      title: 'Delete Account',
      message: `Permanently delete ${targetUser.name}'s account and all their data? This cannot be undone.`,
      confirmLabel: 'Delete Forever',
      danger: true,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await api.delete(`/users/${targetUser.id}`);
          setActionSuccess('User deleted permanently');
          fetchUsers();
        } catch (err: any) {
          setActionError(err?.response?.data?.message || 'Failed to delete user');
        }
      },
    });
  };

  const filteredUsers = users.filter((u) => {
    const isActive = u.isActive ?? true;
    const matchesSearch =
      (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.phone || '').includes(search);
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && isActive) ||
      (statusFilter === 'BANNED' && !isActive);
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (authLoading || !currentUser) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        <Header title="User Management" subtitle="Manage accounts, roles, and access" />

        <main className="flex-1 bg-gradient-to-b from-slate-950 via-slate-900/30 to-slate-950 p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">User Management</h1>
              <p className="text-sm text-slate-400">View accounts, promote/demote administrators, and manage access.</p>
            </div>
            <button onClick={fetchUsers} className="self-start sm:self-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-semibold transition-all flex items-center space-x-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Toasts */}
          {actionSuccess && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center justify-between">
              <div className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4" /><span>{actionSuccess}</span></div>
              <button onClick={() => setActionSuccess(null)} className="hover:opacity-80"><X className="w-4 h-4" /></button>
            </div>
          )}
          {actionError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between">
              <div className="flex items-center space-x-2"><XCircle className="w-4 h-4" /><span>{actionError}</span></div>
              <button onClick={() => setActionError(null)} className="hover:opacity-80"><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="Search by name, email, or phone..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm" />
            </div>
            <div className="flex items-center gap-3">
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as any)}
                className="px-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-300 text-sm focus:outline-none focus:border-indigo-500">
                <option value="ALL">All Roles</option>
                <option value="ADMIN">Admins Only</option>
                <option value="USER">Standard Users</option>
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-300 text-sm focus:outline-none focus:border-indigo-500">
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Only</option>
                <option value="BANNED">Banned Only</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                Loading accounts...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">No users match the active filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/50 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-4 px-6">User</th>
                      <th className="py-4 px-6">Role</th>
                      <th className="py-4 px-6">Account Status</th>
                      <th className="py-4 px-6">Registered</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredUsers.map((u) => {
                      const isActive = u.isActive ?? true;
                      return (
                        <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center space-x-3">
                              {u.avatar ? (
                                <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover border border-slate-700" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-sm text-indigo-400 border border-slate-700">
                                  {u.name?.[0]?.toUpperCase() ?? 'U'}
                                </div>
                              )}
                              <div>
                                <div className="font-semibold text-white flex items-center space-x-2">
                                  <span>{u.name}</span>
                                  {u.id === currentUser?.id && (
                                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono">YOU</span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-400">{u.email || 'No email'}</div>
                                {u.phone && <div className="text-xs text-slate-500">{u.countryCode} {u.phone}</div>}
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-6">
                            <button onClick={() => handleRoleToggle(u)} title="Click to toggle ADMIN / USER"
                              className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                                u.role === 'ADMIN'
                                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20'
                                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                              }`}>
                              <Shield className="w-3.5 h-3.5" />
                              <span>{u.role}</span>
                            </button>
                          </td>

                          <td className="py-4 px-6">
                            <button onClick={() => handleStatusToggle(u)} title={isActive ? 'Click to Ban' : 'Click to Activate'}
                              className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                isActive
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                              }`}>
                              {isActive ? <><ToggleRight className="w-4 h-4" /><span>Active</span></> : <><ToggleLeft className="w-4 h-4" /><span>Banned</span></>}
                            </button>
                          </td>

                          <td className="py-4 px-6 text-xs text-slate-400">
                            <div>{new Date(u.createdAt).toLocaleDateString()}</div>
                            <div>{new Date(u.createdAt).toLocaleTimeString()}</div>
                          </td>

                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button onClick={() => openEdit(u)} className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors" title="Edit user">
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteUser(u)} className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" title="Delete user">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Full Edit Modal ── */}
      {editUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Edit User</h3>
              <button onClick={() => { setEditUser(null); setActionError(null); }} className="p-2 text-slate-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {actionError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">{actionError}</div>
              )}

              {/* Avatar */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Profile Photo</label>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-slate-700" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-400">
                        <Image className="w-6 h-6" />
                      </div>
                    )}
                    {uploadingAvatar && (
                      <div className="absolute inset-0 rounded-full bg-slate-950/70 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center space-x-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-all"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload Photo</span>
                    </button>
                    <input
                      type="text"
                      value={editAvatarUrl}
                      onChange={(e) => { setEditAvatarUrl(e.target.value); setAvatarPreview(e.target.value || null); }}
                      placeholder="or paste image URL..."
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 text-xs font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarFileChange} className="hidden" />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Full Name</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500" />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Email Address</label>
                <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500" />
              </div>

              {/* Mobile Number */}
              <div className="flex space-x-3">
                <div className="w-1/3">
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Dial Code</label>
                  <input type="text" value={editCountryCode} onChange={(e) => setEditCountryCode(e.target.value)}
                    placeholder="+1"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Phone Number</label>
                  <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="2025550174"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Role</label>
                <select value={editRole} onChange={(e) => setEditRole(e.target.value as UserRole)}
                  disabled={editUser.id === currentUser?.id}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed">
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
                {editUser.id === currentUser?.id && (
                  <p className="text-[11px] text-slate-500 mt-1">You cannot change your own role.</p>
                )}
              </div>

              {/* Active toggle (not for self) */}
              {editUser.id !== currentUser?.id && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Account Status</label>
                  <button type="button" onClick={() => setEditActive(!editActive)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl border w-full transition-all ${
                      editActive
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}>
                    {editActive ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                    <div className="text-left">
                      <div className="font-semibold text-sm">{editActive ? 'Active' : 'Banned'}</div>
                      <div className="text-xs opacity-70">{editActive ? 'User can log in' : 'User is blocked from the app'}</div>
                    </div>
                  </button>
                </div>
              )}

              {/* Footer */}
              <div className="flex justify-end space-x-3 pt-2 border-t border-slate-800">
                <button onClick={() => { setEditUser(null); setActionError(null); }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl">
                  Cancel
                </button>
                <button onClick={handleSaveEdit} disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30 disabled:opacity-50 flex items-center space-x-2">
                  {saving && <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Modal (replaces alert) ── */}
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
