'use client';

import React, { useMemo, useState } from 'react';
import { Activity, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, Clock3, Database, RefreshCw, Save, ShieldCheck, Users, WalletCards, XCircle } from 'lucide-react';
import type { AdminFinanceData, AdminReviewPayload, PaymentRequest, ProviderConnection } from '@/lib/store';

interface AdminViewProps {
  data: AdminFinanceData;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => Promise<unknown>;
  onReview: (id: string, payload: AdminReviewPayload) => Promise<unknown>;
  onSaveProvider: (provider: ProviderConnection) => Promise<unknown>;
}

type Tab = 'requests' | 'users' | 'ledger' | 'providers';
type Notice = { kind: 'success' | 'error'; text: string } | null;
const CODES: ProviderConnection['code'][] = ['kbz', 'wave', 'aya', 'cb'];
const NAMES: Record<ProviderConnection['code'], string> = { kbz: 'KBZPay', wave: 'WavePay', aya: 'AYA Pay', cb: 'CB Pay' };
const mmk = (amount: number) => `${Math.max(0, amount).toLocaleString()} MMK`;
const dateText = (date: string) => date ? new Date(date).toLocaleString('my-MM') : '—';

const inputClass = 'mt-1 w-full rounded-xl border border-white/10 bg-[#09111f] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400/70';
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50';

export const AdminView: React.FC<AdminViewProps> = ({ data, isLoading, error, onRefresh, onReview, onSaveProvider }) => {
  const [tab, setTab] = useState<Tab>('requests');
  const [notice, setNotice] = useState<Notice>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [depositAmounts, setDepositAmounts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [payoutRefs, setPayoutRefs] = useState<Record<string, string>>({});
  const [payoutProviders, setPayoutProviders] = useState<Record<string, ProviderConnection['code']>>({});
  const [providerDrafts, setProviderDrafts] = useState<Record<string, { name: string; receiver_phone: string; receiver_name: string; status: 'active' | 'disabled' }>>({});
  const [query, setQuery] = useState('');

  const configuredProviders = useMemo(() => new Map(data.providers.map((provider) => [provider.code, provider])), [data.providers]);
  const pending = data.requests.filter((request) => request.status === 'pending');
  const filteredUsers = data.users.filter((user) => `${user.identifier} ${user.id}`.toLowerCase().includes(query.toLowerCase()));
  const filteredLedger = data.transactions.filter((entry) => `${entry.user_identifier || ''} ${entry.description} ${entry.reference_key || ''}`.toLowerCase().includes(query.toLowerCase()));

  const runReview = async (requestId: string, payload: AdminReviewPayload) => {
    setBusyKey(requestId);
    setNotice(null);
    try {
      const result = await onReview(requestId, payload) as { message?: string };
      setNotice({ kind: 'success', text: result.message || 'တောင်းဆိုမှုကို database ထဲတွင် အပ်ဒိတ်လုပ်ပြီးပါပြီ။' });
      setDepositAmounts((current) => { const next = { ...current }; delete next[requestId]; return next; });
      setNotes((current) => { const next = { ...current }; delete next[requestId]; return next; });
      setPayoutRefs((current) => { const next = { ...current }; delete next[requestId]; return next; });
    } catch (cause) {
      setNotice({ kind: 'error', text: (cause as Error).message || 'တောင်းဆိုမှုကို မပြောင်းလဲနိုင်ပါ။' });
    } finally {
      setBusyKey(null);
    }
  };

  const saveProvider = async (code: ProviderConnection['code']) => {
    const current = configuredProviders.get(code);
    const draft = providerDrafts[code] || {
      name: current?.name || NAMES[code],
      receiver_phone: current?.receiver_phone || '',
      receiver_name: current?.receiver_name || '',
      status: current?.status || 'disabled',
    };
    setBusyKey(`provider-${code}`);
    setNotice(null);
    try {
      const result = await onSaveProvider({ code, ...draft }) as { message?: string };
      setNotice({ kind: 'success', text: result.message || `${draft.name} အကောင့်ကို သိမ်းဆည်းပြီးပါပြီ။` });
      setProviderDrafts((all) => { const next = { ...all }; delete next[code]; return next; });
    } catch (cause) {
      setNotice({ kind: 'error', text: (cause as Error).message || 'လက်ခံအကောင့်ကို မသိမ်းနိုင်ပါ။' });
    } finally {
      setBusyKey(null);
    }
  };

  const updateProviderDraft = (code: ProviderConnection['code'], key: 'name' | 'receiver_phone' | 'receiver_name' | 'status', value: string) => {
    const current = configuredProviders.get(code);
    setProviderDrafts((all) => ({
      ...all,
      [code]: {
        name: all[code]?.name ?? current?.name ?? NAMES[code],
        receiver_phone: all[code]?.receiver_phone ?? current?.receiver_phone ?? '',
        receiver_name: all[code]?.receiver_name ?? current?.receiver_name ?? '',
        status: all[code]?.status ?? current?.status ?? 'disabled',
        [key]: value,
      } as { name: string; receiver_phone: string; receiver_name: string; status: 'active' | 'disabled' },
    }));
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'requests', label: 'ငွေလွှဲတောင်းဆိုမှု', icon: Clock3, count: pending.length },
    { id: 'users', label: 'အသုံးပြုသူများ', icon: Users },
    { id: 'ledger', label: 'စာရင်းလယ်ဂျာ', icon: Activity },
    { id: 'providers', label: 'လက်ခံအကောင့်', icon: WalletCards },
  ];

  return (
    <div className="space-y-5 pb-16 text-slate-100 sm:space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0d1627] p-4 sm:p-5">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-amber-400"><ShieldCheck className="h-4 w-4" /> Server-verified admin</p>
          <h1 className="mt-1 text-xl font-black text-white sm:text-2xl">ငွေကြေးစီမံခန့်ခွဲမှု</h1>
          <p className="mt-1 text-xs text-slate-400">Wallet, ငွေလွှဲတောင်းဆိုမှုနှင့် စာရင်းလယ်ဂျာအားလုံး database မှ တိုက်ရိုက်ဖတ်ထားသည်။</p>
        </div>
        <button type="button" className={`${buttonClass} border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10`} onClick={() => void onRefresh().catch(() => undefined)} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> ပြန်စစ်ရန်
        </button>
      </header>

      {notice && <div role="status" aria-live="polite" className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${notice.kind === 'success' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/20 bg-rose-500/10 text-rose-200'}`}>
        {notice.kind === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}{notice.text}
      </div>}
      {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error} — <button className="underline" onClick={() => void onRefresh().catch(() => undefined)}>ပြန်စမ်းရန်</button></div>}

      {/* Auto-Win System Controller Status */}
      <section className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 to-[#0d1627] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-white">Auto-Win ထိန်းချုပ်စနစ် (Least Bet Side Wins)</h2>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                  စနစ်ဖွင့်ထားသည် (ENABLED)
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-300">
                WinGo, K3, 5D, TRX ဂိမ်းများတွင် ကာလအလိုက် လောင်းကြေးအနည်းဆုံးဘက်ကို အလိုအလျောက် အနိုင်ရလဒ်အဖြစ် သတ်မှတ်ပေးသည့် စနစ် အပြည့်အဝ အသက်ဝင်နေပါသည်။
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="inline-block rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-mono text-emerald-400 font-bold">
              Algorithm: MinPool(Wager)
            </span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric label="အသုံးပြုသူ" value={`${data.stats.totalUsers.toLocaleString()} ဦး`} icon={<Users className="h-4 w-4" />} />
        <Metric label="Wallet လက်ကျန်စုစုပေါင်း" value={mmk(data.stats.walletTotal)} icon={<WalletCards className="h-4 w-4" />} />
        <Metric label="ငွေထုတ် reserve" value={mmk(data.stats.walletReserved)} icon={<Clock3 className="h-4 w-4" />} tone="amber" />
        <Metric label="လက်ရှိသုံးနိုင်သောစုစုပေါင်း" value={mmk(data.stats.walletAvailable)} icon={<Database className="h-4 w-4" />} tone="green" />
        <Metric label="စစ်ဆေးရန် ငွေသွင်း" value={`${data.stats.pendingDeposits.toLocaleString()} ခု`} icon={<ArrowDownToLine className="h-4 w-4" />} tone="amber" />
        <Metric label="စစ်ဆေးရန် ငွေထုတ်" value={`${data.stats.pendingWithdrawals.toLocaleString()} ခု`} icon={<ArrowUpFromLine className="h-4 w-4" />} tone="amber" />
        <Metric label="အတည်ပြုထားသောငွေသွင်း" value={mmk(data.stats.approvedDeposits)} icon={<ArrowDownToLine className="h-4 w-4" />} tone="green" />
        <Metric label="အတည်ပြုထားသောငွေထုတ်" value={mmk(data.stats.approvedWithdrawals)} icon={<ArrowUpFromLine className="h-4 w-4" />} />
      </section>

      <nav className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-[#0d1627] p-2 sm:grid-cols-4">
        {tabs.map(({ id, label, icon: Icon, count }) => <button key={id} type="button" onClick={() => setTab(id)} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-xs font-bold transition ${tab === id ? 'bg-amber-400 text-[#151a21]' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
          <Icon className="h-4 w-4" /><span>{label}</span>{Boolean(count) && <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${tab === id ? 'bg-black/10' : 'bg-rose-500 text-white'}`}>{count}</span>}
        </button>)}
      </nav>

      {tab === 'requests' && <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-lg font-black text-white">တောင်းဆိုမှုများ</h2><p className="text-xs text-slate-400">Pending ဖြစ်နေသောငွေသွင်း/ထုတ်များကိုသာ ပြင်ပမှတ်တမ်းနှင့်စစ်ပြီး ဆောင်ရွက်ပါ။</p></div><span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300">{pending.length} ခု ဆိုင်းငံ့</span></div>
        {data.requests.length === 0 ? <Empty>တောင်းဆိုမှု မရှိသေးပါ။</Empty> : data.requests.map((request) => {
          const key = String(request.id);
          const isPending = request.status === 'pending';
          return <article key={key} className="rounded-2xl border border-white/10 bg-[#0d1627] p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 rounded-xl p-2 ${request.kind === 'deposit' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-sky-400/10 text-sky-300'}`}>{request.kind === 'deposit' ? <ArrowDownToLine className="h-5 w-5" /> : <ArrowUpFromLine className="h-5 w-5" />}</span>
                <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-white">{request.kind === 'deposit' ? 'ငွေသွင်း' : 'ငွေထုတ်'} · #{request.id}</h3><Status status={request.status} /></div>
                  <p className="mt-1 text-sm text-slate-300">{request.user_identifier} <span className="text-slate-500">· {request.account_number || request.phone || '—'}</span></p>
                  <p className="mt-1 break-all text-xs text-slate-400">{request.kind === 'deposit' ? `Transfer ID: ${request.transfer_id || request.txn_id || '—'}` : `လက်ခံမည့်ဖုန်း: ${request.account_number || request.phone || '—'}${request.payout_reference ? ` · Payout: ${request.payout_reference}` : ''}`}</p>
                  <p className="mt-1 text-[11px] text-slate-500">တင်သွင်းချိန်: {dateText(request.created_at)}{request.admin_note ? ` · မှတ်ချက်: ${request.admin_note}` : ''}</p>
                </div>
              </div>
              <div className="min-w-32 text-right"><p className="text-[10px] uppercase tracking-wider text-slate-500">Amount</p><p className="mt-1 font-black text-white">{request.amount === null ? 'စစ်ဆေးပြီးမှ' : mmk(request.amount)}</p></div>
            </div>
            {isPending && <div className="mt-4 border-t border-white/10 pt-4">
              <label className="mb-3 block"><span className="text-xs font-bold text-slate-300">Admin မှတ်ချက် (ရွေးချယ်နိုင်)</span><input className={inputClass} value={notes[key] || ''} onChange={(event) => setNotes((current) => ({ ...current, [key]: event.target.value }))} placeholder="စစ်ဆေးမှုမှတ်ချက်" maxLength={500} /></label>
              {request.kind === 'deposit' ? <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
                <label><span className="text-xs font-bold text-slate-300">လက်ခံရရှိကြောင်း စစ်ဆေးပြီးသော MMK ပမာဏ</span><input className={inputClass} inputMode="numeric" value={depositAmounts[key] || ''} onChange={(event) => setDepositAmounts((current) => ({ ...current, [key]: event.target.value }))} placeholder="ဥပမာ 10000" /></label>
                <label><span className="text-xs font-bold text-slate-300">လက်ခံဝန်ဆောင်မှု</span><select className={inputClass} value={payoutProviders[key] || ''} onChange={(event) => setPayoutProviders((current) => ({ ...current, [key]: event.target.value as ProviderConnection['code'] }))}><option value="">မရွေးထား</option>{data.providers.map((provider) => <option key={provider.code} value={provider.code} disabled={provider.status !== 'active'}>{provider.name}</option>)}</select></label>
                <button type="button" disabled={busyKey === key} onClick={() => void runReview(key, { decision: 'approve', amountMmk: Number((depositAmounts[key] || '').replace(/[ ,]/g, '')), providerCode: payoutProviders[key], note: notes[key] })} className={`${buttonClass} bg-emerald-500 text-white hover:bg-emerald-400`}> <CheckCircle2 className="h-4 w-4" /> အတည်ပြု</button>
                <button type="button" disabled={busyKey === key} onClick={() => void runReview(key, { decision: 'reject', note: notes[key] })} className={`${buttonClass} border border-rose-400/20 bg-rose-400/10 text-rose-200 hover:bg-rose-400/20`}><XCircle className="h-4 w-4" /> ပယ်ချ</button>
              </div> : <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
                <label><span className="text-xs font-bold text-slate-300">အမှန်တကယ်လွှဲပြီးသော payout reference</span><input className={inputClass} value={payoutRefs[key] || ''} onChange={(event) => setPayoutRefs((current) => ({ ...current, [key]: event.target.value }))} placeholder="Transfer ID အပြည့်အစုံ" /></label>
                <label><span className="text-xs font-bold text-slate-300">ပေးပို့သည့်ဝန်ဆောင်မှု</span><select className={inputClass} value={payoutProviders[key] || ''} onChange={(event) => setPayoutProviders((current) => ({ ...current, [key]: event.target.value as ProviderConnection['code'] }))}><option value="">ဝန်ဆောင်မှုရွေးရန်</option>{data.providers.filter((provider) => provider.status === 'active').map((provider) => <option key={provider.code} value={provider.code}>{provider.name}</option>)}</select></label>
                <button type="button" disabled={busyKey === key} onClick={() => void runReview(key, { decision: 'approve', providerCode: payoutProviders[key], payoutReference: payoutRefs[key], note: notes[key] })} className={`${buttonClass} bg-emerald-500 text-white hover:bg-emerald-400`}><CheckCircle2 className="h-4 w-4" /> လွှဲပြီးမှအတည်ပြု</button>
                <button type="button" disabled={busyKey === key} onClick={() => void runReview(key, { decision: 'reject', note: notes[key] })} className={`${buttonClass} border border-rose-400/20 bg-rose-400/10 text-rose-200 hover:bg-rose-400/20`}><XCircle className="h-4 w-4" /> ပယ်ချ</button>
                <p className="text-xs text-amber-200 sm:col-span-4">အရင်ဆုံး wallet provider မှ အမှန်တကယ်ငွေလွှဲပြီးနောက် reference ထည့်၍ အတည်ပြုပါ။ ဒီ dashboard ကိုယ်တိုင် ငွေမပို့ပါ။</p>
              </div>}
            </div>}
          </article>;
        })}
      </section>}

      {tab === 'users' && <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1627]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4"><div><h2 className="font-black text-white">User Wallet စာရင်း</h2><p className="text-xs text-slate-400">နောက်ဆုံး account ၂၀၀ ခု · database မှအချက်အလက်</p></div><input className="w-full max-w-xs rounded-xl border border-white/10 bg-[#09111f] px-3 py-2 text-sm text-white outline-none focus:border-amber-400/70" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Email/ဖုန်း/ID ရှာရန်" /></div>
        <div className="overflow-x-auto"><table className="min-w-[760px] w-full text-left text-xs"><thead className="bg-white/[0.03] text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">အသုံးပြုသူ</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Balance</th><th className="px-4 py-3 text-right">Reserved</th><th className="px-4 py-3 text-right">ရနိုင်</th><th className="px-4 py-3">ဖွင့်ချိန်</th></tr></thead><tbody className="divide-y divide-white/5">{filteredUsers.map((user) => <tr key={user.id} className="text-slate-300"><td className="px-4 py-3"><div className="font-bold text-white">{user.identifier}</div><div className="text-[10px] text-slate-500">ID #{user.id}</div></td><td className="px-4 py-3">{user.status === 'active' ? 'အသုံးပြုနိုင်' : 'ဆိုင်းငံ့'}</td><td className="px-4 py-3 text-right font-bold">{mmk(user.balance)}</td><td className="px-4 py-3 text-right text-amber-200">{mmk(user.reserved)}</td><td className="px-4 py-3 text-right font-bold text-emerald-200">{mmk(user.available)}</td><td className="px-4 py-3 text-slate-500">{dateText(user.created_at)}</td></tr>)}</tbody></table></div>
        {filteredUsers.length === 0 && <Empty>ကိုက်ညီသော user မတွေ့ပါ။</Empty>}
      </section>}

      {tab === 'ledger' && <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1627]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4"><div><h2 className="font-black text-white">Wallet လယ်ဂျာ</h2><p className="text-xs text-slate-400">နောက်ဆုံး transaction ၁၀၀ ခု</p></div><input className="w-full max-w-xs rounded-xl border border-white/10 bg-[#09111f] px-3 py-2 text-sm text-white outline-none focus:border-amber-400/70" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Account/reference ရှာရန်" /></div>
        <div className="divide-y divide-white/5">{filteredLedger.map((entry) => <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"><div className="min-w-0"><p className="truncate text-sm font-bold text-white">{entry.description}</p><p className="mt-1 truncate text-xs text-slate-400">{entry.user_identifier || `User #${entry.user_id}`} · {entry.reference_key || `#${entry.id}`} · {dateText(entry.created_at)}</p></div><div className="text-right"><p className={`font-black ${entry.amount > 0 ? 'text-emerald-300' : entry.amount < 0 ? 'text-rose-300' : 'text-slate-300'}`}>{entry.amount > 0 ? '+' : ''}{entry.amount.toLocaleString()} MMK</p><p className="text-[10px] text-slate-500">ပြီးနောက် {mmk(entry.balance_after)}</p></div></div>)}{filteredLedger.length === 0 && <Empty>စာရင်းမှတ်တမ်း မရှိသေးပါ။</Empty>}</div>
      </section>}

      {tab === 'providers' && <section className="space-y-3">
        <div><h2 className="text-lg font-black text-white">User များမြင်မည့် ငွေလက်ခံအကောင့်</h2><p className="text-xs leading-5 text-slate-400">အမှန်တကယ် အသုံးပြုမည့် receiver အချက်အလက်ကိုသာ ထည့်ပါ။ API အလိုအလျောက်ငွေလွှဲ/စစ်ဆေးခြင်း မရှိပါ။</p></div>
        <div className="grid gap-3 lg:grid-cols-2">{CODES.map((code) => {
          const saved = configuredProviders.get(code);
          const draft = providerDrafts[code] || { name: saved?.name || NAMES[code], receiver_phone: saved?.receiver_phone || '', receiver_name: saved?.receiver_name || '', status: saved?.status || 'disabled' };
          return <article key={code} className="rounded-2xl border border-white/10 bg-[#0d1627] p-4 sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-2"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-400">{code}</p><h3 className="mt-1 font-black text-white">{saved ? 'လက်ခံအကောင့်ပြင်ရန်' : 'လက်ခံအကောင့်သတ်မှတ်ရန်'}</h3></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${draft.status === 'active' ? 'bg-emerald-400/10 text-emerald-200' : 'bg-slate-400/10 text-slate-400'}`}>{draft.status === 'active' ? 'Active' : 'Disabled'}</span></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-300">ဝန်ဆောင်မှုအမည်<input className={inputClass} value={draft.name} onChange={(event) => updateProviderDraft(code, 'name', event.target.value)} maxLength={100} /></label>
              <label className="text-xs font-bold text-slate-300">လက်ခံသူဖုန်း<input className={inputClass} value={draft.receiver_phone} inputMode="tel" onChange={(event) => updateProviderDraft(code, 'receiver_phone', event.target.value)} placeholder="09xxxxxxxxx" maxLength={24} /></label>
              <label className="text-xs font-bold text-slate-300">လက်ခံသူအမည်<input className={inputClass} value={draft.receiver_name} onChange={(event) => updateProviderDraft(code, 'receiver_name', event.target.value)} maxLength={128} /></label>
              <label className="text-xs font-bold text-slate-300">အခြေအနေ<select className={inputClass} value={draft.status} onChange={(event) => updateProviderDraft(code, 'status', event.target.value)}><option value="active">Active · User များမြင်မည်</option><option value="disabled">Disabled · User များမမြင်</option></select></label>
            </div>
            <button type="button" onClick={() => void saveProvider(code)} disabled={busyKey === `provider-${code}`} className={`${buttonClass} mt-4 bg-amber-400 text-[#151a21] hover:bg-amber-300`}><Save className="h-4 w-4" /> {busyKey === `provider-${code}` ? 'သိမ်းနေသည်…' : 'အကောင့်သိမ်းမည်'}</button>
          </article>;
        })}</div>
      </section>}
    </div>
  );
};

function Metric({ label, value, icon, tone = 'default' }: { label: string; value: string; icon: React.ReactNode; tone?: 'default' | 'amber' | 'green' }) {
  const toneClass = tone === 'amber' ? 'text-amber-300 bg-amber-400/10' : tone === 'green' ? 'text-emerald-300 bg-emerald-400/10' : 'text-slate-300 bg-white/5';
  return <article className="min-w-0 rounded-2xl border border-white/10 bg-[#0d1627] p-3.5 sm:p-4"><div className="flex items-start justify-between gap-2"><span className="line-clamp-2 text-[10px] font-bold leading-4 text-slate-400 sm:text-xs">{label}</span><span className={`rounded-lg p-1.5 ${toneClass}`}>{icon}</span></div><p className="mt-3 break-words text-sm font-black leading-5 text-white sm:text-base">{value}</p></article>;
}

function Status({ status }: { status: PaymentRequest['status'] }) {
  const label = status === 'pending' ? 'စစ်ဆေးဆဲ' : status === 'approved' ? 'အတည်ပြုပြီး' : 'ပယ်ချထားသည်';
  const tone = status === 'pending' ? 'bg-amber-400/10 text-amber-200' : status === 'approved' ? 'bg-emerald-400/10 text-emerald-200' : 'bg-rose-400/10 text-rose-200';
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${tone}`}>{label}</span>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-slate-400">{children}</div>;
}
