import React, { useState, useEffect } from 'react';
import { ExternalLink, Save, CheckCircle2, Eye } from 'lucide-react';
import { api, API_BASE_URL } from '../services/api';
import type { LegalLinks } from '../types';

export const LegalPage: React.FC = () => {
  const [links, setLinks] = useState<LegalLinks>({
    termsUrl: `${API_BASE_URL.replace(/\/api\/v1$/, '')}/terms-and-conditions`,
    privacyPolicyUrl: `${API_BASE_URL.replace(/\/api\/v1$/, '')}/privacy-policy`,
    deleteAccountUrl: `${API_BASE_URL.replace(/\/api\/v1$/, '')}/delete-account`,
  });
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms' | 'delete'>('privacy');
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    const fetchLegal = async () => {
      try {
        const res = await api.get('/legal');
        const data = res.data?.data || res.data;
        if (data) {
          setLinks({
            termsUrl: data.termsUrl || links.termsUrl,
            privacyPolicyUrl: data.privacyPolicyUrl || links.privacyPolicyUrl,
            deleteAccountUrl: data.deleteAccountUrl || links.deleteAccountUrl,
          });
        }
      } catch (err) {
        console.error('Failed to load legal links', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLegal();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(false);
    try {
      await api.put('/legal', links);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save legal links', err);
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Legal & Privacy Policy CMS</h1>
        <p className="text-sm text-slate-400">
          Manage Terms of Service, Privacy Policy, and App Store / Google Play compliant legal documents.
        </p>
      </div>

      {saved && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5" />
          <span>Legal endpoints and links saved successfully!</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          Failed to save. Please try again.
        </div>
      )}

      {/* URL Configuration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Privacy Policy</span>
            <a
              href={links.privacyPolicyUrl}
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-white"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          <input
            type="text"
            value={links.privacyPolicyUrl}
            onChange={(e) => setLinks({ ...links, privacyPolicyUrl: e.target.value })}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
          />
          <p className="text-[11px] text-slate-400">Read by mobile app from GET /legal</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Terms & Conditions</span>
            <a
              href={links.termsUrl}
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-white"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          <input
            type="text"
            value={links.termsUrl}
            onChange={(e) => setLinks({ ...links, termsUrl: e.target.value })}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
          />
          <p className="text-[11px] text-slate-400">Public policy page hosted on backend</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Delete Account Policy</span>
            {links.deleteAccountUrl && (
              <a
                href={links.deleteAccountUrl}
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-white"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
          <input
            type="text"
            value={links.deleteAccountUrl || ''}
            onChange={(e) => setLinks({ ...links, deleteAccountUrl: e.target.value })}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
          />
          <p className="text-[11px] text-slate-400">Required by Apple App Store review</p>
        </div>
      </div>

      {/* Policy Preview & Editor Section */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
          <div className="flex items-center space-x-2">
            <Eye className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Live Policy Document Preview</h2>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('privacy')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'privacy'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setActiveTab('terms')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'terms'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Terms & Conditions
            </button>
            <button
              onClick={() => setActiveTab('delete')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'delete'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Delete Account
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="p-6 bg-slate-950/80 rounded-xl border border-slate-800/80 text-sm text-slate-300 space-y-4 max-h-[450px] overflow-y-auto leading-relaxed">
          {activeTab === 'privacy' && (
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Privacy Policy for {{DISPLAY_NAME}}</h3>
              <p className="text-xs text-slate-400 mb-4">Last modified: {new Date().toLocaleDateString()}</p>
              <p>
                This Privacy Policy explains how {{DISPLAY_NAME}} collects, uses, and discloses information about you when you access or use our mobile application and related online services.
              </p>
              <h4 className="text-sm font-bold text-white mt-4 mb-1">1. Information We Collect</h4>
              <p>
                We collect information you provide directly to us, such as when you create or modify your account, request customer support, or communicate with us. This includes your name, email address, phone number, and device tokens for push notifications.
              </p>
              <h4 className="text-sm font-bold text-white mt-4 mb-1">2. Data Security & Storage</h4>
              <p>
                We implement robust encryption and security controls to maintain the safety of your personal data against unauthorized disclosure or destruction.
              </p>
            </div>
          )}

          {activeTab === 'terms' && (
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Terms & Conditions of Service</h3>
              <p className="text-xs text-slate-400 mb-4">Effective Date: {new Date().toLocaleDateString()}</p>
              <p>
                Please read these terms and conditions carefully before using our mobile application or related APIs.
              </p>
              <h4 className="text-sm font-bold text-white mt-4 mb-1">1. Agreement to Terms</h4>
              <p>
                By accessing {{DISPLAY_NAME}}, you agree to be bound by these Terms. If you disagree with any part of these terms, you may not access our service.
              </p>
              <h4 className="text-sm font-bold text-white mt-4 mb-1">2. User Accounts & Responsibilities</h4>
              <p>
                When you create an account, you must provide accurate and complete information. You are responsible for safeguarding your credentials and any actions performed through your account.
              </p>
            </div>
          )}

          {activeTab === 'delete' && (
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Account Deletion & Data Removal</h3>
              <p className="text-xs text-slate-400 mb-4">Compliant with Google Play & Apple App Store Guidelines</p>
              <p>
                Users have the complete right to request deletion of their account and all associated personal data stored within {{DISPLAY_NAME}}.
              </p>
              <h4 className="text-sm font-bold text-white mt-4 mb-1">In-App Deletion</h4>
              <p>
                Navigate to Profile → Settings → Delete Account inside the mobile application. All tokens, chats, devices, and profile data will be permanently wiped.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Legal Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
