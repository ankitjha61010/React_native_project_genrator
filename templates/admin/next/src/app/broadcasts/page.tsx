'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Users, History, CheckCircle2, AlertCircle, RefreshCw, Radio } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import type { Broadcast } from '../../types';

export default function BroadcastsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('general');
  const [audience, setAudience] = useState<'all' | 'users' | 'admins'>('all');
  const [extraData, setExtraData] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchBroadcasts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications/broadcasts?limit=50');
      const list = res.data?.data || res.data || [];
      setBroadcasts(Array.isArray(list) ? list : []);
    } catch (err: any) {
      console.error('Failed to load broadcasts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchBroadcasts();
    }
  }, [user]);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setSending(true);
    setStatusMessage(null);

    let parsedData: Record<string, string> | undefined;
    if (extraData.trim()) {
      try {
        parsedData = JSON.parse(extraData);
      } catch {
        setStatusMessage({ type: 'error', text: 'Extra data must be valid JSON format (e.g. {"screen": "Promo"})' });
        setSending(false);
        return;
      }
    }

    try {
      const res = await api.post('/notifications/broadcast', {
        title: title.trim(),
        body: body.trim(),
        type,
        audience,
        ...(parsedData ? { data: parsedData } : {}),
      });

      const data = res.data?.data || res.data;
      const count = data?.recipientCount ?? 0;
      setStatusMessage({ 
        type: 'success', 
        text: `Broadcast sent successfully to ${count} recipient${count === 1 ? '' : 's'}!` 
      });

      setTitle('');
      setBody('');
      setExtraData('');
      fetchBroadcasts();
    } catch (err: any) {
      setStatusMessage({ 
        type: 'error', 
        text: err?.response?.data?.message || err?.message || 'Failed to dispatch broadcast' 
      });
    } finally {
      setSending(false);
    }
  };

  if (authLoading || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <Sidebar />

      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        <Header title="Broadcast Notifications" subtitle="Send push messages across mobile endpoints" />

        <main className="flex-1 bg-gradient-to-b from-slate-950 via-slate-900/30 to-slate-950 p-8 space-y-8 max-w-7xl mx-auto w-full">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Broadcast Push Notifications</h1>
            <p className="text-sm text-slate-400">
              Compose and dispatch real-time FCM & APNs push notifications to mobile devices.
            </p>
          </div>

          {statusMessage && (
            <div className={`p-4 rounded-xl border text-sm flex items-center justify-between ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              <div className="flex items-center space-x-2">
                {statusMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <span>{statusMessage.text}</span>
              </div>
              <button onClick={() => setStatusMessage(null)} className="font-bold hover:opacity-80">×</button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex items-center space-x-2 pb-4 border-b border-slate-800">
                <Radio className="w-5 h-5 text-indigo-400" />
                <h2 className="text-base font-bold text-white">Compose Broadcast</h2>
              </div>

              <form onSubmit={handleSendBroadcast} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Target Audience
                  </label>
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">All Active Users</option>
                    <option value="users">Standard Users Only</option>
                    <option value="admins">Administrators Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Notification Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="general">General</option>
                    <option value="account">Account Notice</option>
                    <option value="promotion">Promotion</option>
                    <option value="order">Order Update</option>
                    <option value="chat">Chat</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Notification Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Scheduled Maintenance Tomorrow"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Message Body *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Type your push notification message..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Custom Data Payload (JSON, Optional)
                  </label>
                  <input
                    type="text"
                    placeholder='{"screen": "HomeScreen", "promoId": "100"}'
                    value={extraData}
                    onChange={(e) => setExtraData(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl text-sm transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {sending ? (
                    <span className="flex items-center space-x-2">
                      <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Dispatching push payload...</span>
                    </span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Broadcast Notification</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <History className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-base font-bold text-white">Broadcast History</h2>
                </div>
                <button
                  onClick={fetchBroadcasts}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                  title="Refresh history"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loading ? (
                <div className="py-12 text-center text-slate-400 text-sm">Loading broadcasts...</div>
              ) : broadcasts.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No broadcast notifications have been sent yet.
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {broadcasts.map((b) => (
                    <div
                      key={b.id}
                      className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="font-semibold text-white text-sm">{b.title}</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {b.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mb-3">{b.body}</p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <div className="flex items-center space-x-2">
                          <Users className="w-3.5 h-3.5" />
                          <span>{b.recipientCount} device{b.recipientCount === 1 ? '' : 's'} reached</span>
                          <span>·</span>
                          <span className="capitalize">Audience: {b.audience}</span>
                        </div>
                        <div>{new Date(b.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
