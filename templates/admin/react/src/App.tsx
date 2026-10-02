import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardPage } from './pages/DashboardPage';
import { UsersPage } from './pages/UsersPage';
import { BroadcastsPage } from './pages/BroadcastsPage';
import { LegalPage } from './pages/LegalPage';
{{#if OTA}}
import { OTAPage } from './pages/OTAPage';
{{/if}}
{{#if PAYMENTS}}
import { PaymentsManager } from './components/PaymentsManager';
{{/if}}

export const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Verifying administrator session...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return <LoginPage />;
  }

  const getHeaderInfo = () => {
    switch (currentTab) {
      case 'dashboard':
        return { title: 'Dashboard Overview', subtitle: 'Real-time telemetry and management metrics' };
      case 'users':
        return { title: 'User Management', subtitle: 'Manage accounts, toggle roles, and control access' };
      case 'broadcasts':
        return { title: 'Broadcast Notifications', subtitle: 'Send push messages across mobile endpoints' };
      case 'legal':
        return { title: 'Legal & Privacy CMS', subtitle: 'Terms of service, privacy policy and deletion compliance' };
{{#if OTA}}
      case 'ota':
        return { title: 'Over-The-Air (OTA) Updates', subtitle: 'Manage native React Native bundle deployments and rollbacks' };
{{/if}}
{{#if PAYMENTS}}
      case 'payments':
        return { title: 'Payments', subtitle: 'Products, {{#if GATEWAY}}transactions & refunds, {{/if}}{{#if IAP}}store purchases, {{/if}}user access' };
{{/if}}
      default:
        return { title: 'Admin Console', subtitle: 'System administration' };
    }
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Fixed Sidebar */}
      <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* Main Content Area */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        <Header title={headerInfo.title} subtitle={headerInfo.subtitle} />

        <main className="flex-1 bg-gradient-to-b from-slate-950 via-slate-900/30 to-slate-950 pb-12">
          {currentTab === 'dashboard' && <DashboardPage onNavigate={setCurrentTab} />}
          {currentTab === 'users' && <UsersPage />}
          {currentTab === 'broadcasts' && <BroadcastsPage />}
          {currentTab === 'legal' && <LegalPage />}
{{#if OTA}}
          {currentTab === 'ota' && <OTAPage />}
{{/if}}
{{#if PAYMENTS}}
          {currentTab === 'payments' && (
            <div className="p-8 max-w-7xl mx-auto">
              <PaymentsManager />
            </div>
          )}
{{/if}}
        </main>
      </div>
    </div>
  );
};
