'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Save, CheckCircle2, AlertCircle, X, Globe } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, API_BASE_URL } from '../../services/api';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import type { LegalLinks } from '../../types';

// Dynamic import to avoid SSR issues with Syncfusion
import dynamic from 'next/dynamic';

const RichTextEditorComponent = dynamic(
  () => import('./Editor'),
  { ssr: false, loading: () => <div className="h-[400px] bg-slate-950 rounded-xl border border-slate-800 animate-pulse" /> }
);

type LegalTab = 'privacy' | 'terms' | 'delete';

const TAB_CONFIG: { key: LegalTab; label: string; urlKey: keyof LegalLinks; hint: string }[] = [
  { key: 'privacy', label: 'Privacy Policy', urlKey: 'privacyPolicyUrl', hint: 'Read by mobile app via GET /legal' },
  { key: 'terms', label: 'Terms & Conditions', urlKey: 'termsUrl', hint: 'Public policy page hosted on backend' },
  { key: 'delete', label: 'Delete Account', urlKey: 'deleteAccountUrl', hint: 'Required by Apple App Store review' },
];

const DEFAULT_CONTENT: Record<LegalTab, string> = {
  privacy: `<h1>Privacy Policy</h1>
<p>Last modified: ${new Date().toLocaleDateString()}</p>
<p>This Privacy Policy explains how we collect, use, and disclose information about you when you access or use our mobile application and related online services.</p>
<h2>1. Information We Collect</h2>
<p>We collect information you provide directly to us, such as when you create or modify your account, request customer support, or communicate with us. This includes your name, email address, phone number, and device tokens for push notifications.</p>
<h2>2. Data Security &amp; Storage</h2>
<p>We implement robust encryption and security controls to maintain the safety of your personal data against unauthorized disclosure or destruction.</p>
<h2>3. Your Rights</h2>
<p>You may request access to, correction of, or deletion of your personal data at any time by contacting us or using the in-app deletion feature.</p>`,

  terms: `<h1>Terms &amp; Conditions</h1>
<p>Effective Date: ${new Date().toLocaleDateString()}</p>
<p>Please read these terms and conditions carefully before using our mobile application or related APIs.</p>
<h2>1. Agreement to Terms</h2>
<p>By accessing our app, you agree to be bound by these Terms. If you disagree with any part of these terms, you may not access our service.</p>
<h2>2. User Accounts &amp; Responsibilities</h2>
<p>When you create an account, you must provide accurate and complete information. You are responsible for safeguarding your credentials and any actions performed through your account.</p>
<h2>3. Prohibited Uses</h2>
<p>You may not use our service for any unlawful purposes or to transmit any material that is abusive, threatening, or otherwise objectionable.</p>`,

  delete: `<h1>Account Deletion &amp; Data Removal</h1>
<p>Compliant with Google Play &amp; Apple App Store Guidelines.</p>
<p>Users have the complete right to request deletion of their account and all associated personal data stored within our application.</p>
<h2>In-App Deletion</h2>
<p>Navigate to <strong>Profile → Settings → Delete Account</strong> inside the mobile application. All tokens, chats, devices, and profile data will be permanently wiped.</p>
<h2>Manual Request</h2>
<p>If you are unable to access the app, email us at <a href="mailto:support@example.com">support@example.com</a> with your registered email or phone number and request deletion.</p>
<h2>Data Retention</h2>
<p>Anonymized analytics data may be retained for up to 90 days post-deletion for service improvement purposes.</p>`,
};

// Toolbar is now in Editor.tsx

export default function LegalPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const baseUrl = API_BASE_URL.replace(/\/api\/v1$/, '');

  const [links, setLinks] = useState<LegalLinks>({
    termsUrl: `${baseUrl}/terms-and-conditions`,
    privacyPolicyUrl: `${baseUrl}/privacy-policy`,
    deleteAccountUrl: `${baseUrl}/delete-account`,
  });

  const [activeTab, setActiveTab] = useState<LegalTab>('privacy');
  const [editorContent, setEditorContent] = useState<Record<LegalTab, string>>(DEFAULT_CONTENT);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      api.get('/legal')
        .then((res) => {
          const data = res.data?.data || res.data;
          if (data) {
            setLinks((prev) => ({
              termsUrl: data.termsUrl || prev.termsUrl,
              privacyPolicyUrl: data.privacyPolicyUrl || prev.privacyPolicyUrl,
              deleteAccountUrl: data.deleteAccountUrl || prev.deleteAccountUrl,
            }));
            setEditorContent({
              privacy: data.privacyPolicyHtml || DEFAULT_CONTENT.privacy,
              terms: data.termsHtml || DEFAULT_CONTENT.terms,
              delete: data.deleteAccountHtml || DEFAULT_CONTENT.delete,
            });
          }
        })
        .catch(() => {});
    }
  }, [user]);

  // When switching tabs, just update activeTab
  const switchTab = (tab: LegalTab) => {
    setActiveTab(tab);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    try {
      const payload = {
        ...links,
        privacyPolicyHtml: editorContent.privacy,
        termsHtml: editorContent.terms,
        deleteAccountHtml: editorContent.delete,
      };
      await api.put('/legal', payload);
      setSaveStatus({ type: 'success', text: 'Legal settings saved successfully!' });
      setTimeout(() => setSaveStatus(null), 4000);
    } catch {
      setSaveStatus({ type: 'error', text: 'Failed to save. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) return null;

  const activeConfig = TAB_CONFIG.find((t) => t.key === activeTab)!;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Load Syncfusion CSS via CDN */}
      <link href="https://cdn.syncfusion.com/ej2/material-dark.css" rel="stylesheet" />
      <Sidebar />
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        <Header title="Legal & Privacy CMS" subtitle="Terms of service, privacy policy and deletion compliance" />

        <main className="flex-1 bg-gradient-to-b from-slate-950 via-slate-900/30 to-slate-950 p-8 space-y-8 max-w-7xl mx-auto w-full">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Legal & Privacy CMS</h1>
            <p className="text-sm text-slate-400">
              Edit Terms, Privacy Policy, and App Store / Google Play compliant legal documents.
            </p>
          </div>

          {/* Status toast */}
          {saveStatus && (
            <div className={`p-4 rounded-xl border text-sm flex items-center justify-between ${
              saveStatus.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              <div className="flex items-center space-x-2">
                {saveStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{saveStatus.text}</span>
              </div>
              <button onClick={() => setSaveStatus(null)}><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* URL Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TAB_CONFIG.map(({ key, label, urlKey, hint }) => (
              <div key={key} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">{label}</span>
                  {links[urlKey] && (
                    <a href={links[urlKey]} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                <input
                  type="text"
                  value={links[urlKey] || ''}
                  onChange={(e) => setLinks({ ...links, [urlKey]: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-500">{hint}</p>
              </div>
            ))}
          </div>

          {/* Rich Text Editor */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            {/* Tab bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
              <div className="flex items-center space-x-1">
                {TAB_CONFIG.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => switchTab(key)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      activeTab === key
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-slate-500" />
                <a
                  href={links[activeConfig.urlKey]}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-slate-400 hover:text-indigo-400 font-mono truncate max-w-[200px]"
                >
                  {links[activeConfig.urlKey]}
                </a>
              </div>
            </div>

            {/* Editor area */}
            <div className="p-6">
              <p className="text-xs text-slate-500 mb-3">
                Editing: <span className="text-indigo-400 font-semibold">{activeConfig.label}</span> — use the toolbar to format, or switch to Source Code view for raw HTML.
              </p>

              <div className="rounded-xl overflow-hidden border border-slate-700">
                <RichTextEditorComponent
                  value={editorContent[activeTab]}
                  onChange={(e: any) =>
                    setEditorContent((prev) => ({ ...prev, [activeTab]: e.value }))
                  }
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/30">
              <p className="text-xs text-slate-500">
                HTML content is saved directly to your backend. You can also update the URLs above to point to external documents.
              </p>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center space-x-2 disabled:opacity-50"
              >
                {saving && <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                <Save className="w-4 h-4" />
                <span>Save Legal Settings</span>
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Syncfusion dark theme overrides */}
      <style jsx global>{`
        .custom-rte-dark .e-richtexteditor {
          background: #030712 !important;
          border: none !important;
          color: #e2e8f0 !important;
        }
        .custom-rte-dark .e-toolbar-wrapper,
        .custom-rte-dark .e-rte-toolbar {
          background: #0f172a !important;
          border-bottom: 1px solid #1e293b !important;
        }
        .custom-rte-dark .e-toolbar-item button,
        .custom-rte-dark .e-tbar-btn {
          color: #94a3b8 !important;
        }
        .custom-rte-dark .e-toolbar-item button:hover,
        .custom-rte-dark .e-tbar-btn:hover {
          background: #1e293b !important;
          color: #ffffff !important;
        }
        .custom-rte-dark .e-content {
          background: #030712 !important;
          color: #e2e8f0 !important;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          line-height: 1.7;
          padding: 20px 24px !important;
          box-sizing: border-box !important;
          overflow-y: auto !important;
        }
        .custom-rte-dark .e-rte-content {
          overflow-y: auto !important;
        }
        .custom-rte-dark .e-content h1 { color: #ffffff; font-size: 22px; font-weight: 700; margin-bottom: 8px; }
        .custom-rte-dark .e-content h2 { color: #f1f5f9; font-size: 16px; font-weight: 600; margin-top: 20px; margin-bottom: 6px; }
        .custom-rte-dark .e-content p  { color: #cbd5e1; margin-bottom: 10px; }
        .custom-rte-dark .e-content a  { color: #818cf8; }
        .custom-rte-dark .e-rte-character-count { color: #475569 !important; }
        .custom-rte-dark .e-rte-srctextarea {
          background: #030712 !important;
          color: #a5f3fc !important;
          font-family: 'JetBrains Mono', monospace !important;
        }
      `}</style>
    </div>
  );
}
