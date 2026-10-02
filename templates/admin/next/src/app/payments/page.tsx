'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Header } from '../../components/Header';
import { PaymentsManager } from '../../components/PaymentsManager';

export default function PaymentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) router.push('/login');
  }, [user, authLoading, router]);

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        <Header title="Payments" subtitle="Products, {{#if GATEWAY}}transactions & refunds, {{/if}}{{#if IAP}}store purchases, {{/if}}user access" />
        <main className="flex-1 bg-gradient-to-b from-slate-950 via-slate-900/30 to-slate-950 p-8 max-w-7xl mx-auto w-full">
          <PaymentsManager />
        </main>
      </div>
    </div>
  );
}
