import React, { useState, useEffect } from 'react';
import { Users, Shield, BellRing, CheckCircle2, ArrowUpRight, Sparkles, TrendingUp } from 'lucide-react';
import { api } from '../services/api';
import type { User, Broadcast } from '../types';

interface DashboardPageProps {
  onNavigate: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, broadcastsRes] = await Promise.allSettled([
          api.get('/users?limit=100'),
          api.get('/notifications/broadcasts?limit=20'),
        ]);

        if (usersRes.status === 'fulfilled') {
          const list = usersRes.value.data?.data || usersRes.value.data || [];
          setUsers(Array.isArray(list) ? list : []);
        }

        if (broadcastsRes.status === 'fulfilled') {
          const bList = broadcastsRes.value.data?.data || broadcastsRes.value.data || [];
          setBroadcasts(Array.isArray(bList) ? bList : []);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive).length;
  const adminUsers = users.filter((u) => u.role === 'ADMIN').length;
  const totalBroadcasts = broadcasts.length;

  const stats = [
    {
      title: 'Total Users',
      value: loading ? '...' : totalUsers.toString(),
      subtext: `${activeUsers} active accounts`,
      icon: Users,
      color: 'from-blue-600 to-indigo-600',
      tab: 'users',
    },
    {
      title: 'Active Users',
      value: loading ? '...' : activeUsers.toString(),
      subtext: `${totalUsers - activeUsers} restricted/banned`,
      icon: CheckCircle2,
      color: 'from-emerald-600 to-teal-600',
      tab: 'users',
    },
    {
      title: 'Administrators',
      value: loading ? '...' : adminUsers.toString(),
      subtext: 'Full system privileges',
      icon: Shield,
      color: 'from-violet-600 to-purple-600',
      tab: 'users',
    },
    {
      title: 'Push Broadcasts',
      value: loading ? '...' : totalBroadcasts.toString(),
      subtext: 'Sent to registered devices',
      icon: BellRing,
      color: 'from-amber-600 to-orange-600',
      tab: 'broadcasts',
    },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/60 via-slate-900/80 to-purple-900/60 border border-indigo-500/20 p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Unified Management Portal</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Welcome to the {{DISPLAY_NAME}} Admin Console
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-xl">
              Manage accounts, configure admin roles, dispatch push notifications, and monitor over-the-air system deployments.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onNavigate('broadcasts')}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-600/30 flex items-center space-x-2"
            >
              <BellRing className="w-4 h-4" />
              <span>Send Broadcast</span>
            </button>
            <button
              onClick={() => onNavigate('users')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-semibold transition-all flex items-center space-x-2"
            >
              <Users className="w-4 h-4" />
              <span>Manage Users</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div
              key={idx}
              onClick={() => onNavigate(s.tab)}
              className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all cursor-pointer group hover:-translate-y-1 duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${s.color} flex items-center justify-center text-white shadow-lg`}>
                  <Icon className="w-6 h-6" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{s.title}</p>
              <h3 className="text-2xl font-bold text-white mt-1">{s.value}</h3>
              <p className="text-xs text-slate-400 mt-1">{s.subtext}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Users preview */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Recent User Registrations</h3>
          </div>
          <button
            onClick={() => onNavigate('users')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-400 text-sm">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">No registered users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3">User</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.slice(0, 5).map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-indigo-300">
                        {u.name ? u.name[0].toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{u.name}</div>
                        <div className="text-xs text-slate-400">{u.email || u.phone || 'No email'}</div>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        u.role === 'ADMIN' 
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        u.isActive 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        <span>{u.isActive ? 'Active' : 'Banned'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-400 text-xs">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
