import React, { useState, useEffect } from 'react';
import { Send, Users, History, CheckCircle2, AlertCircle, RefreshCw, Radio, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import type { Broadcast } from '../types';

export const BroadcastsPage: React.FC = () => {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('general');
  const [audience, setAudience] = useState<'all' | 'users' | 'admins'>('all');
  const [extraData, setExtraData] = useState('');

  // Status
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  /** Removes a broadcast from the history – and from every recipient's notification inbox. */
  const handleDeleteBroadcast = async (broadcast: Broadcast) => {
    if (!window.confirm(`Delete "${broadcast.title}"?\n\nIt is also removed from every recipient's notification inbox.`)) return;
    setDeletingId(broadcast.id);
    setStatusMessage(null);
    try {
      await api.delete(`/notifications/broadcasts/${encodeURIComponent(broadcast.id)}`);
      setBroadcasts(prev => prev.filter(b => b.id !== broadcast.id));
      setStatusMessage({ type: 'success', text: 'Broadcast deleted.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.response?.data?.message || err?.message || 'Failed to delete the broadcast' });
    } finally {
      setDeletingId(null);
    }
  };

  /** Removes every broadcast (and their copies in the users' inboxes). */
  const handleDeleteAllBroadcasts = async () => {
    if (!window.confirm('Delete ALL broadcasts?\n\nThey are also removed from every recipient\'s notification inbox. This cannot be undone.')) return;
    setClearing(true);
    setStatusMessage(null);
    try {
      const res = await api.delete('/notifications/broadcasts');
      const count = res.data?.data?.count ?? 0;
      setBroadcasts([]);
      setStatusMessage({ type: 'success', text: `${count} broadcast${count === 1 ? '' : 's'} deleted.` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.response?.data?.message || err?.message || 'Failed to delete the broadcasts' });
    } finally {
      setClearing(false);
    }
  };

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
    fetchBroadcasts();
  }, []);

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

      // Reset form
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

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Title */}
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
        {/* Compose Form */}
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

        {/* Sent History Table */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <History className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white">Broadcast History</h2>
            </div>
            <div className="flex items-center gap-2">
              {broadcasts.length > 0 && (
                <button
                  onClick={handleDeleteAllBroadcasts}
                  disabled={clearing}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 disabled:opacity-50 transition-colors"
                  title="Delete every broadcast"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{clearing ? 'Deleting…' : 'Delete all'}</span>
                </button>
              )}
              <button
                onClick={fetchBroadcasts}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
                title="Refresh history"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
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
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {b.type}
                      </span>
                      <button
                        onClick={() => handleDeleteBroadcast(b)}
                        disabled={deletingId === b.id || clearing}
                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-50 transition-colors"
                        title="Delete broadcast"
                      >
                        <Trash2 className={`w-3.5 h-3.5 ${deletingId === b.id ? 'animate-pulse' : ''}`} />
                      </button>
                    </div>
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
    </div>
  );
};
