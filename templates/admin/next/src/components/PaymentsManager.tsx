'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, {{#if GATEWAY}}CreditCard, {{/if}}{{#if IAP}}Gift, {{/if}}Package, Pencil, Plus, RefreshCw, Trash2, {{#if GATEWAY}}Undo2, {{/if}}X } from 'lucide-react';
import { api } from '../services/api';
import type { Entitlement, PaymentProduct, PaymentStats{{#if GATEWAY}}, Payment, PaymentStatus{{/if}}{{#if IAP}}, StorePurchase{{/if}} } from '../types';

/**
 * Admin → Payments{{#if GATEWAY}} ({{GATEWAY_NAME}}){{/if}}{{#if IAP}} (in-app purchases: {{IAP_PROVIDER_NAME}}){{/if}}.
 * Everything goes through /payments/admin/* (permission payments:manage).
 */

type Tab = 'overview' | 'products'{{#if GATEWAY}} | 'transactions'{{/if}}{{#if IAP}} | 'purchases'{{/if}} | 'access';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'products', label: 'Products' },
{{#if GATEWAY}}
  { id: 'transactions', label: 'Transactions' },
{{/if}}
{{#if IAP}}
  { id: 'purchases', label: 'Store purchases' },
{{/if}}
  { id: 'access', label: 'User access' },
];

// Minor-unit helpers (999 USD = 9.99) – the same rules as the backend.
const ZERO = ['BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'];
const THREE = ['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND'];
const digits = (currency: string) => (ZERO.includes(currency.toUpperCase()) ? 0 : THREE.includes(currency.toUpperCase()) ? 3 : 2);
const toMajor = (amount: number, currency: string) => (amount / 10 ** digits(currency)).toFixed(digits(currency));
const toMinor = (value: string, currency: string) => Math.round(Number(value) * 10 ** digits(currency));
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—');
const errorText = (err: any, fallback: string) => err?.response?.data?.message || err?.message || fallback;

const input = 'w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500';
const card = 'bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl';
const th = 'text-left text-xs font-semibold uppercase tracking-wider text-slate-400 px-3 py-2';
const td = 'px-3 py-2.5 text-sm text-slate-200 border-t border-slate-800/80';

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  failed: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  refunded: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
  partially_refunded: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  expired: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
  revoked: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};
const Badge = ({ value }: { value: string }) => (
  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_COLORS[value] ?? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>{value.replace('_', ' ')}</span>
);

interface ProductForm {
  name: string;
  description: string;
  kind: 'one_time' | 'subscription';
  price: string;
  currency: string;
  accessLevel: string;
  durationDays: string;
  appleProductId: string;
  googleProductId: string;
  active: boolean;
  sortOrder: string;
}

const EMPTY_FORM: ProductForm = { name: '', description: '', kind: 'one_time', price: '', currency: 'USD', accessLevel: 'premium', durationDays: '', appleProductId: '', googleProductId: '', active: true, sortOrder: '0' };

export const PaymentsManager: React.FC = () => {
  const [tab, setTab] = useState<Tab>('overview');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [products, setProducts] = useState<PaymentProduct[]>([]);
  const [form, setForm] = useState<ProductForm | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
{{#if GATEWAY}}
  const [payments, setPayments] = useState<Payment[]>([]);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | ''>('');
{{/if}}
{{#if IAP}}
  const [purchases, setPurchases] = useState<StorePurchase[]>([]);
{{/if}}
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [userFilter, setUserFilter] = useState('');
  const [grant, setGrant] = useState({ userId: '', accessLevel: 'premium', expiresAt: '' });

  const run = useCallback(async (task: () => Promise<void>, success?: string) => {
    setLoading(true);
    setMessage(null);
    try {
      await task();
      if (success) setMessage({ type: 'success', text: success });
    } catch (err: any) {
      setMessage({ type: 'error', text: errorText(err, 'Request failed') });
    } finally {
      setLoading(false);
    }
  }, []);

  const load = useCallback(
    () =>
      run(async () => {
        if (tab === 'overview') setStats((await api.get('/payments/admin/stats')).data.data);
        if (tab === 'products') setProducts((await api.get('/payments/admin/products?all=true')).data.data ?? []);
{{#if GATEWAY}}
        if (tab === 'transactions') setPayments((await api.get(`/payments/admin/payments?limit=100${statusFilter ? `&status=${statusFilter}` : ''}`)).data.data ?? []);
{{/if}}
{{#if IAP}}
        if (tab === 'purchases') setPurchases((await api.get('/payments/admin/purchases?limit=100')).data.data ?? []);
{{/if}}
        if (tab === 'access') {
          const query = userFilter.trim() ? `&userId=${encodeURIComponent(userFilter.trim())}` : '';
          setEntitlements((await api.get(`/payments/admin/entitlements?limit=100${query}`)).data.data ?? []);
        }
      }),
    [run, tab{{#if GATEWAY}}, statusFilter{{/if}}, userFilter],
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab{{#if GATEWAY}}, statusFilter{{/if}}]);

  // ── products ───────────────────────────────────────────────────────────────

  const openForm = (product?: PaymentProduct) => {
    setEditingId(product?.id ?? null);
    setForm(
      product
        ? {
            name: product.name,
            description: product.description ?? '',
            kind: product.kind,
            price: toMajor(product.price, product.currency),
            currency: product.currency,
            accessLevel: product.accessLevel,
            durationDays: product.durationDays ? String(product.durationDays) : '',
            appleProductId: product.appleProductId ?? '',
            googleProductId: product.googleProductId ?? '',
            active: product.active,
            sortOrder: String(product.sortOrder),
          }
        : { ...EMPTY_FORM },
    );
  };

  const saveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const body = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      kind: form.kind,
      price: toMinor(form.price || '0', form.currency),
      currency: form.currency.trim().toUpperCase(),
      accessLevel: form.accessLevel.trim(),
      durationDays: form.durationDays ? Number(form.durationDays) : null,
      appleProductId: form.appleProductId.trim() || null,
      googleProductId: form.googleProductId.trim() || null,
      active: form.active,
      sortOrder: Number(form.sortOrder || 0),
    };
    run(async () => {
      if (editingId) await api.patch(`/payments/admin/products/${editingId}`, body);
      else await api.post('/payments/admin/products', body);
      setForm(null);
      setProducts((await api.get('/payments/admin/products?all=true')).data.data ?? []);
    }, editingId ? 'Product updated.' : 'Product created.');
  };

  const deleteProduct = (product: PaymentProduct) => {
    if (!window.confirm(`Delete "${product.name}"?\n\nPast payments keep their product id. To stop selling it, deactivate it instead.`)) return;
    run(async () => {
      await api.delete(`/payments/admin/products/${product.id}`);
      setProducts(prev => prev.filter(p => p.id !== product.id));
    }, 'Product deleted.');
  };
{{#if GATEWAY}}

  // ── refunds ────────────────────────────────────────────────────────────────

  const refund = (payment: Payment) => {
    const left = payment.amount - payment.refundedAmount;
    const answer = window.prompt(
      `Refund how much of ${payment.displayAmount}? (${toMajor(left, payment.currency)} ${payment.currency} left)\n\nLeave empty to refund everything left – a full refund also removes the access it gave.`,
      '',
    );
    if (answer === null) return;
    const amount = answer.trim() ? toMinor(answer, payment.currency) : undefined;
    run(async () => {
      const updated: Payment = (await api.post(`/payments/admin/payments/${payment.id}/refund`, amount ? { amount } : {})).data.data;
      setPayments(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    }, 'Refund sent to {{GATEWAY_NAME}}.');
  };
{{/if}}

  // ── access ─────────────────────────────────────────────────────────────────

  const grantAccess = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await api.post('/payments/admin/entitlements', {
        userId: grant.userId.trim(),
        accessLevel: grant.accessLevel.trim(),
        expiresAt: grant.expiresAt ? new Date(grant.expiresAt).toISOString() : null,
      });
      setGrant({ userId: '', accessLevel: 'premium', expiresAt: '' });
      setEntitlements((await api.get('/payments/admin/entitlements?limit=100')).data.data ?? []);
    }, 'Access granted.');
  };

  const revoke = (entitlement: Entitlement) => {
    if (!window.confirm(`Revoke "${entitlement.accessLevel}" from user ${entitlement.userId}?`)) return;
    run(async () => {
      const updated: Entitlement = (await api.delete(`/payments/admin/entitlements/${entitlement.id}`)).data.data;
      setEntitlements(prev => prev.map(e => (e.id === updated.id ? updated : e)));
    }, 'Access revoked.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 bg-slate-900/60 border border-slate-800 rounded-xl p-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={load} className="text-slate-400 hover:text-white p-2 rounded-lg" title="Refresh">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-xl border text-sm flex items-center justify-between ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {tab === 'overview' && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={card}>
            <BadgeCheck className="w-5 h-5 text-indigo-400 mb-2" />
            <p className="text-2xl font-bold text-white">{stats.activeEntitlements}</p>
            <p className="text-xs text-slate-400">Users / access levels active now</p>
          </div>
          <div className={card}>
            <Package className="w-5 h-5 text-indigo-400 mb-2" />
            <p className="text-2xl font-bold text-white">{stats.products}</p>
            <p className="text-xs text-slate-400">Products in the catalog</p>
          </div>
{{#if GATEWAY}}
          <div className={card}>
            <CreditCard className="w-5 h-5 text-indigo-400 mb-2" />
            <p className="text-2xl font-bold text-white">{stats.paidPayments ?? 0}</p>
            <p className="text-xs text-slate-400">Paid {{GATEWAY_NAME}} payments</p>
          </div>
          <div className={card}>
            <p className="text-xs text-slate-400 mb-2">Revenue (net of refunds)</p>
            {(stats.revenue ?? []).length === 0 ? (
              <p className="text-2xl font-bold text-white">—</p>
            ) : (
              (stats.revenue ?? []).map(r => (
                <p key={r.currency} className="text-xl font-bold text-white">
                  {toMajor(r.amount, r.currency)} {r.currency}
                </p>
              ))
            )}
          </div>
{{/if}}
{{#if IAP}}
          <div className={card}>
            <Gift className="w-5 h-5 text-indigo-400 mb-2" />
            <p className="text-2xl font-bold text-white">{stats.purchases ?? 0}</p>
            <p className="text-xs text-slate-400">Store purchases ({{IAP_PROVIDER_NAME}})</p>
          </div>
{{/if}}
        </div>
      )}

      {tab === 'products' && (
        <div className={card}>
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white">Products</h2>
              <p className="text-xs text-slate-400">
{{#if IAP}}
                Products with an App Store / Google Play id are sold as in-app purchases (create them in App Store Connect / Play Console with the same id).
{{/if}}
{{#if GATEWAY}}
                {{#if IAP}}Products without one are{{else}}Products are{{/if}} paid through {{GATEWAY_NAME}}.
{{/if}}
              </p>
            </div>
            <button onClick={() => openForm()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white">
              <Plus className="w-4 h-4" /> New product
            </button>
          </div>

          {form && (
            <form onSubmit={saveProduct} className="grid grid-cols-1 md:grid-cols-3 gap-3 py-4 border-b border-slate-800">
              <label className="md:col-span-2 text-xs text-slate-400 space-y-1">
                Name
                <input className={input} required maxLength={120} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </label>
              <label className="text-xs text-slate-400 space-y-1">
                Type
                <select className={input} value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value as ProductForm['kind'] })}>
                  <option value="one_time">One-time</option>
                  <option value="subscription">Subscription</option>
                </select>
              </label>
              <label className="md:col-span-3 text-xs text-slate-400 space-y-1">
                Description
                <input className={input} maxLength={1000} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </label>
              <label className="text-xs text-slate-400 space-y-1">
                Price
                <input className={input} required inputMode="decimal" pattern="[0-9]+([.][0-9]{1,3})?" placeholder="9.99" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
              </label>
              <label className="text-xs text-slate-400 space-y-1">
                Currency (ISO)
                <input className={input} required maxLength={3} value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
              </label>
              <label className="text-xs text-slate-400 space-y-1">
                Unlocks access level
                <input className={input} required pattern="[a-z0-9_-]{1,64}" value={form.accessLevel} onChange={e => setForm({ ...form, accessLevel: e.target.value })} />
              </label>
              <label className="text-xs text-slate-400 space-y-1">
                Access for (days, empty = forever)
                <input className={input} inputMode="numeric" pattern="[0-9]*" value={form.durationDays} onChange={e => setForm({ ...form, durationDays: e.target.value })} />
              </label>
{{#if IAP}}
              <label className="text-xs text-slate-400 space-y-1">
                App Store product id
                <input className={input} placeholder="com.app.premium.monthly" value={form.appleProductId} onChange={e => setForm({ ...form, appleProductId: e.target.value })} />
              </label>
              <label className="text-xs text-slate-400 space-y-1">
                Google Play product id
                <input className={input} placeholder="premium_monthly" value={form.googleProductId} onChange={e => setForm({ ...form, googleProductId: e.target.value })} />
              </label>
{{/if}}
              <label className="text-xs text-slate-400 space-y-1">
                Sort order
                <input className={input} inputMode="numeric" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: e.target.value })} />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300 md:col-span-2">
                <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Active (shown in the app)
              </label>
              <div className="md:col-span-3 flex gap-2">
                <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50">
                  {editingId ? 'Save changes' : 'Create product'}
                </button>
                <button type="button" onClick={() => setForm(null)} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full mt-2">
              <thead>
                <tr>
                  <th className={th}>Name</th>
                  <th className={th}>Price</th>
                  <th className={th}>Access</th>
{{#if IAP}}
                  <th className={th}>Store ids</th>
{{/if}}
                  <th className={th}>Status</th>
                  <th className={th} />
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td className={td}>
                      <p className="font-semibold text-white">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.kind === 'subscription' ? 'Subscription' : 'One-time'}</p>
                    </td>
                    <td className={td}>{p.displayPrice}</td>
                    <td className={td}>
                      {p.accessLevel} · {p.durationDays ? `${p.durationDays} days` : 'forever'}
                    </td>
{{#if IAP}}
                    <td className={`${td} text-xs text-slate-400`}>
                      <p>iOS: {p.appleProductId ?? '—'}</p>
                      <p>Android: {p.googleProductId ?? '—'}</p>
                    </td>
{{/if}}
                    <td className={td}>
                      <Badge value={p.active ? 'active' : 'expired'} />
                    </td>
                    <td className={`${td} text-right whitespace-nowrap`}>
                      <button onClick={() => openForm(p)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteProduct(p)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {products.length === 0 && !loading && <p className="py-8 text-center text-sm text-slate-400">No products yet – create the first one.</p>}
          </div>
        </div>
      )}
{{#if GATEWAY}}

      {tab === 'transactions' && (
        <div className={card}>
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <h2 className="text-base font-bold text-white">{{GATEWAY_NAME}} transactions</h2>
            <select className={`${input} w-48`} value={statusFilter} onChange={e => setStatusFilter(e.target.value as PaymentStatus | '')}>
              <option value="">All statuses</option>
              {['pending', 'paid', 'failed', 'partially_refunded', 'refunded'].map(s => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full mt-2">
              <thead>
                <tr>
                  <th className={th}>Date</th>
                  <th className={th}>User</th>
                  <th className={th}>Amount</th>
                  <th className={th}>Status</th>
                  <th className={th}>Provider ids</th>
                  <th className={th} />
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td className={td}>{date(p.paidAt ?? p.createdAt)}</td>
                    <td className={`${td} font-mono text-xs`}>{p.userId}</td>
                    <td className={td}>
                      {p.displayAmount}
                      {p.refundedAmount > 0 && <p className="text-xs text-slate-400">refunded {toMajor(p.refundedAmount, p.currency)}</p>}
                    </td>
                    <td className={td}>
                      <Badge value={p.status} />
                      {p.failureReason && <p className="text-xs text-rose-400 mt-1">{p.failureReason}</p>}
                    </td>
                    <td className={`${td} font-mono text-[11px] text-slate-400`}>
                      <p>{p.providerOrderId}</p>
                      <p>{p.providerPaymentId ?? ''}</p>
                    </td>
                    <td className={`${td} text-right`}>
                      {(p.status === 'paid' || p.status === 'partially_refunded') && (
                        <button onClick={() => refund(p)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-400 border border-rose-500/20 hover:bg-rose-500/10">
                          <Undo2 className="w-3.5 h-3.5" /> Refund
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {payments.length === 0 && !loading && <p className="py-8 text-center text-sm text-slate-400">No transactions.</p>}
          </div>
        </div>
      )}
{{/if}}
{{#if IAP}}

      {tab === 'purchases' && (
        <div className={card}>
          <div className="pb-4 border-b border-slate-800">
            <h2 className="text-base font-bold text-white">Store purchases</h2>
            <p className="text-xs text-slate-400">Verified with the App Store / Google Play – refunds happen in the stores.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full mt-2">
              <thead>
                <tr>
                  <th className={th}>Date</th>
                  <th className={th}>User</th>
                  <th className={th}>Product</th>
                  <th className={th}>Store</th>
                  <th className={th}>Status</th>
                  <th className={th}>Expires</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map(p => (
                  <tr key={p.id}>
                    <td className={td}>{date(p.purchasedAt)}</td>
                    <td className={`${td} font-mono text-xs`}>{p.userId}</td>
                    <td className={td}>{p.storeProductId}</td>
                    <td className={td}>
                      {p.store === 'app_store' ? 'App Store' : 'Google Play'}
                      {p.environment && <p className="text-xs text-slate-400">{p.environment}</p>}
                    </td>
                    <td className={td}>
                      <Badge value={p.status} />
                    </td>
                    <td className={td}>{date(p.expiresAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {purchases.length === 0 && !loading && <p className="py-8 text-center text-sm text-slate-400">No store purchases yet.</p>}
          </div>
        </div>
      )}
{{/if}}

      {tab === 'access' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={grantAccess} className={`${card} space-y-3`}>
            <h2 className="text-base font-bold text-white">Give access</h2>
            <p className="text-xs text-slate-400">Testers, support cases, compensation – no payment needed.</p>
            <label className="block text-xs text-slate-400 space-y-1">
              User id (Users page)
              <input className={input} required value={grant.userId} onChange={e => setGrant({ ...grant, userId: e.target.value })} />
            </label>
            <label className="block text-xs text-slate-400 space-y-1">
              Access level
              <input className={input} required pattern="[a-z0-9_-]{1,64}" value={grant.accessLevel} onChange={e => setGrant({ ...grant, accessLevel: e.target.value })} />
            </label>
            <label className="block text-xs text-slate-400 space-y-1">
              Expires (empty = never)
              <input className={input} type="datetime-local" value={grant.expiresAt} onChange={e => setGrant({ ...grant, expiresAt: e.target.value })} />
            </label>
            <button type="submit" disabled={loading} className="w-full px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50">
              Grant access
            </button>
          </form>

          <div className={`${card} lg:col-span-2`}>
            <div className="flex items-center gap-2 pb-4 border-b border-slate-800">
              <input className={input} placeholder="Filter by user id" value={userFilter} onChange={e => setUserFilter(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} />
              <button onClick={load} className="px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">
                Search
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full mt-2">
                <thead>
                  <tr>
                    <th className={th}>User</th>
                    <th className={th}>Access</th>
                    <th className={th}>Source</th>
                    <th className={th}>Expires</th>
                    <th className={th}>Status</th>
                    <th className={th} />
                  </tr>
                </thead>
                <tbody>
                  {entitlements.map(e => (
                    <tr key={e.id}>
                      <td className={`${td} font-mono text-xs`}>{e.userId}</td>
                      <td className={td}>{e.accessLevel}</td>
                      <td className={td}>{e.source.replace('_', ' ')}</td>
                      <td className={td}>{date(e.expiresAt)}</td>
                      <td className={td}>
                        <Badge value={e.revokedAt ? 'revoked' : e.active ? 'active' : 'expired'} />
                      </td>
                      <td className={`${td} text-right`}>
                        {e.active && (
                          <button onClick={() => revoke(e)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10" title="Revoke">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {entitlements.length === 0 && !loading && <p className="py-8 text-center text-sm text-slate-400">No access records.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
