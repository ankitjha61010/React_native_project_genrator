import React, { useState, useEffect } from 'react';
import { Search, Shield, CheckCircle2, XCircle, Trash2, Edit3, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { User, UserRole } from '../types';

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'BANNED'>('ALL');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await api.get('/users?limit=100');
      const list = res.data?.data || res.data || [];
      setUsers(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleToggle = async (targetUser: User) => {
    if (targetUser.id === currentUser?.id) {
      alert('You cannot change your own admin role.');
      return;
    }
    const newRole: UserRole = targetUser.role === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!confirm(`Are you sure you want to change ${targetUser.name}'s role to ${newRole}?`)) return;

    try {
      await api.patch(`/users/${targetUser.id}`, { role: newRole });
      setActionSuccess(`Role updated to ${newRole}`);
      fetchUsers();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Failed to update role');
    }
  };

  const handleStatusToggle = async (targetUser: User) => {
    if (targetUser.id === currentUser?.id) {
      alert('You cannot ban your own administrator account.');
      return;
    }
    const newStatus = !targetUser.isActive;
    const actionName = newStatus ? 'activate' : 'ban';
    if (!confirm(`Are you sure you want to ${actionName} ${targetUser.name}?`)) return;

    try {
      await api.patch(`/users/${targetUser.id}`, { isActive: newStatus });
      setActionSuccess(`Account ${newStatus ? 'activated' : 'banned'} successfully`);
      fetchUsers();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || `Failed to ${actionName} user`);
    }
  };

  const handleDeleteUser = async (targetUser: User) => {
    if (targetUser.id === currentUser?.id) {
      alert('You cannot delete your own account from the admin console.');
      return;
    }
    if (!confirm(`Permanently delete ${targetUser.name}'s account and data? This action cannot be undone.`)) return;

    try {
      await api.delete(`/users/${targetUser.id}`);
      setActionSuccess('User deleted permanently');
      fetchUsers();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    try {
      await api.patch(`/users/${selectedUser.id}`, { name: editName });
      setActionSuccess('User updated successfully');
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Failed to update user');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.phone || '').includes(search);
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus = 
      statusFilter === 'ALL' || 
      (statusFilter === 'ACTIVE' && u.isActive) || 
      (statusFilter === 'BANNED' && !u.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">User Management</h1>
          <p className="text-sm text-slate-400">
            View accounts, promote/demote administrators, and manage user access states.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          className="self-start sm:self-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-semibold transition-all flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-emerald-300">×</button>
        </div>
      )}
      {actionError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-rose-400 hover:text-rose-300">×</button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="px-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-300 text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">Admins Only</option>
            <option value="USER">Standard Users</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-300 text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="BANNED">Banned Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
            Loading accounts from database...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No users match the active search and filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/50 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-6">User</th>
                  <th className="py-4 px-6">Role</th>
                  <th className="py-4 px-6">Account Status</th>
                  <th className="py-4 px-6">Registration</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-sm text-indigo-400 border border-slate-700">
                          {u.name ? u.name[0].toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="font-semibold text-white flex items-center space-x-2">
                            <span>{u.name}</span>
                            {u.id === currentUser?.id && (
                              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono">YOU</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">{u.email || 'No email provided'}</div>
                          {u.phone && <div className="text-xs text-slate-400">{u.countryCode} {u.phone}</div>}
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <button
                        onClick={() => handleRoleToggle(u)}
                        title="Click to toggle between ADMIN and USER"
                        className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                        }`}
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>{u.role}</span>
                      </button>
                    </td>

                    <td className="py-4 px-6">
                      <button
                        onClick={() => handleStatusToggle(u)}
                        title={u.isActive ? 'Click to Ban account' : 'Click to Activate account'}
                        className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                          u.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                        }`}
                      >
                        {u.isActive ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Banned</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-4 px-6 text-xs text-slate-400">
                      <div>{new Date(u.createdAt).toLocaleDateString()}</div>
                      <div className="text-slate-400">{new Date(u.createdAt).toLocaleTimeString()}</div>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setEditName(u.name);
                          }}
                          className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Edit user details"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Edit User Account</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
