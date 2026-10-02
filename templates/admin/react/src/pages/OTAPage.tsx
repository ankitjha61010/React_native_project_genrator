import React, { useState, useEffect } from 'react';
import { RefreshCw, RotateCcw, Smartphone, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { api } from '../services/api';
import type { OTARelease } from '../types';

export const OTAPage: React.FC = () => {
  const [releases, setReleases] = useState<OTARelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form: the release.json written by `npm run ota:android` / `ota:ios` in the mobile app.
  const [releaseJson, setReleaseJson] = useState('');
  const [bundleUrl, setBundleUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchReleases = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ota/releases?limit=50');
      const list = res.data?.data || res.data || [];
      setReleases(Array.isArray(list) ? list : []);
    } catch (err: any) {
      console.error('Failed to load OTA releases', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReleases();
  }, []);

  /** The pasted release.json, or an error message. */
  const parseRelease = (): Record<string, unknown> | string => {
    try {
      const release = JSON.parse(releaseJson) as Record<string, unknown>;
      return typeof release === 'object' && release && 'sha256' in release && 'signature' in release ? release : 'This is not a release.json from the OTA script.';
    } catch {
      return 'release.json is not valid JSON.';
    }
  };
  const parsed = releaseJson.trim() ? parseRelease() : null;
  const needsUrl = typeof parsed === 'object' && parsed !== null && !parsed.bundleUrl;

  const handleCreateRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    const release = parseRelease();
    if (typeof release === 'string') {
      setStatusMessage({ type: 'error', text: release });
      return;
    }
    const body: Record<string, unknown> = { ...release, ...(needsUrl ? { bundleUrl: bundleUrl.trim() } : {}) };

    setSubmitting(true);
    setStatusMessage(null);
    try {
      await api.post('/ota/releases', body);
      setStatusMessage({ type: 'success', text: `OTA release ${String(body.otaVersion)} (${String(body.platform)}) published successfully!` });
      setShowCreateModal(false);
      setReleaseJson('');
      setBundleUrl('');
      fetchReleases();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.response?.data?.message || err?.message || 'Failed to publish OTA release',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRollback = async (rel: OTARelease) => {
    if (!confirm(`Are you sure you want to deactivate and rollback release ${rel.version} (${rel.platform})?`)) return;

    try {
      await api.post(`/ota/releases/${rel.id}/rollback`);
      setStatusMessage({ type: 'success', text: `Release ${rel.version} rolled back successfully` });
      fetchReleases();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.response?.data?.message || 'Rollback failed' });
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header & New Release Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Over-The-Air (OTA) Releases</h1>
          <p className="text-sm text-slate-400">
            Publish bundle updates directly to user devices without requiring App Store / Play Store reviews.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchReleases}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
            title="Refresh releases"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-600/30 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Publish New Release</span>
          </button>
        </div>
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

      {/* Releases Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
            Loading OTA releases...
          </div>
        ) : releases.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No OTA bundle releases deployed yet. Click "Publish New Release" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/50 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-6">Release Version</th>
                  <th className="py-4 px-6">Platform</th>
                  <th className="py-4 px-6">Rollout</th>
                  <th className="py-4 px-6">Type</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Created</th>
                  <th className="py-4 px-6 text-right">Rollback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {releases.map((rel) => (
                  <tr key={rel.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-white flex items-center space-x-2">
                        <span>v{rel.version}</span>
                        {(rel.status === 'active') && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">ACTIVE</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono truncate max-w-xs" title={rel.sha256}>
                        {rel.sha256 ? `hash: ${rel.sha256.slice(0, 16)}...` : 'No hash'}
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 capitalize">
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>{rel.platform}</span>
                      </span>
                    </td>

                    <td className="py-4 px-6 text-xs text-slate-300 font-semibold">
                      {rel.targetRolloutPct}% of users
                    </td>

                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        rel.forceUpdate 
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {rel.forceUpdate ? 'Mandatory' : 'Optional'}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        (rel.status === 'active') 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${(rel.status === 'active') ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                        <span>{(rel.status === 'active') ? 'Serving' : 'Disabled'}</span>
                      </span>
                    </td>

                    <td className="py-4 px-6 text-xs text-slate-400">
                      {new Date(rel.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-4 px-6 text-right">
                      {(rel.status === 'active') && (
                        <button
                          onClick={() => handleRollback(rel)}
                          className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors inline-flex items-center space-x-1 text-xs"
                          title="Rollback this release"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Rollback</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Release Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Publish New OTA Release</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">×</button>
            </div>

            <form onSubmit={handleCreateRelease} className="space-y-4">
              <p className="text-xs text-slate-400">
                In the mobile app run <code className="text-indigo-300">npm run ota:android -- --ota-version 2</code> (or <code className="text-indigo-300">ota:ios</code>), then paste the generated <code className="text-indigo-300">release.json</code> here.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">release.json *</label>
                <textarea
                  required
                  rows={10}
                  placeholder='{ "otaVersion": 2, "nativeVersion": "1.0", "platform": "android", ... }'
                  value={releaseJson}
                  onChange={(e) => setReleaseJson(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
                {typeof parsed === 'string' && <p className="mt-1 text-xs text-rose-400">{parsed}</p>}
                {parsed && typeof parsed === 'object' && (
                  <p className="mt-1 text-xs text-emerald-400">
                    OTA v{String(parsed.otaVersion)} · {String(parsed.platform)} · app {String(parsed.nativeVersion)} · {(Number(parsed.bundleSize) / 1024 / 1024).toFixed(2)} MB
                    {parsed.forceUpdate ? ' · mandatory' : ''}
                  </p>
                )}
              </div>

              {needsUrl && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Bundle ZIP URL *</label>
                  <input
                    type="url"
                    required
                    placeholder="https://storage.example.com/ota/android-v2/release.zip"
                    value={bundleUrl}
                    onChange={(e) => setBundleUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <p className="mt-1 text-xs text-slate-500">Where you uploaded release.zip (the phone downloads it from here).</p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || typeof parsed === 'string'}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Publish Release'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
