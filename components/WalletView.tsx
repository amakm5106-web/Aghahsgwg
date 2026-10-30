'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Clock3,
  Copy,
  RefreshCw,
  Wallet,
  ShieldCheck,
  CreditCard,
  Check,
  Building2,
  PhoneCall,
  Sparkles,
} from 'lucide-react';
import type { PaymentRequest, ProviderConnection, User } from '@/lib/store';

interface WalletViewProps {
  currentUser: User;
  initialTab?: 'deposit' | 'withdraw';
  requests: PaymentRequest[];
  providers: ProviderConnection[];
  onCreateDeposit: (phone: string, transferId: string) => Promise<{ message?: string }>;
  onCreateWithdrawal: (amountMMK: number, phone: string) => Promise<{ message?: string }>;
  onRefresh?: () => Promise<unknown>;
}

type Notice = { kind: 'success' | 'error'; text: string } | null;

const formatMMK = (amount: number) => `${Math.max(0, amount).toLocaleString()} MMK`;

const statusBadgeClasses: Record<PaymentRequest['status'], string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-300',
  approved: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  rejected: 'bg-rose-100 text-rose-800 border-rose-300',
};

const statusText: Record<PaymentRequest['status'], string> = {
  pending: 'စစ်ဆေးဆဲ (Pending)',
  approved: 'အတည်ပြုပြီး (Approved)',
  rejected: 'ပယ်ချထားသည် (Rejected)',
};

// Fallback official payment methods if backend providers are not yet populated
const DEFAULT_PAYMENT_PROVIDERS: ProviderConnection[] = [
  {
    code: 'kbz',
    name: 'KBZPay (KPay)',
    receiver_phone: '09987654321',
    receiver_name: 'AzLottery Official',
    status: 'active',
  },
  {
    code: 'wave',
    name: 'WavePay (Wave Money)',
    receiver_phone: '09876543210',
    receiver_name: 'AzLottery Pay',
    status: 'active',
  },
  {
    code: 'cb',
    name: 'CB Pay',
    receiver_phone: '09665432109',
    receiver_name: 'AzLottery Official',
    status: 'active',
  },
  {
    code: 'aya',
    name: 'AYA Pay',
    receiver_phone: '09776543210',
    receiver_name: 'AzLottery Pay',
    status: 'active',
  },
];

const PRESET_AMOUNTS = [10000, 30000, 50000, 100000, 300000, 500000];

export const WalletView: React.FC<WalletViewProps> = ({
  currentUser,
  initialTab = 'deposit',
  requests,
  providers,
  onCreateDeposit,
  onCreateWithdrawal,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'history'>(initialTab);
  const [senderPhone, setSenderPhone] = useState('');
  const [transferId, setTransferId] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);

  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedProvider, setCopiedProvider] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'deposit' | 'withdrawal'>('all');

  const availableBalance = Number(currentUser.wallet_balance) || 0;
  const reservedBalance = Number(currentUser.reserved_balance) || 0;

  // Active providers list (falls back to defaults if empty)
  const displayProviders = useMemo(() => {
    const active = providers.filter((p) => p.status === 'active');
    return active.length > 0 ? active : DEFAULT_PAYMENT_PROVIDERS;
  }, [providers]);

  const myRequests = useMemo(
    () => requests.filter((request) => String(request.user_id) === String(currentUser.id)),
    [requests, currentUser.id]
  );

  const filteredRequests = useMemo(() => {
    if (historyFilter === 'all') return myRequests;
    return myRequests.filter((r) => r.kind === historyFilter);
  }, [myRequests, historyFilter]);

  const copyReceiver = async (phone: string, code: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedProvider(code);
      setTimeout(() => setCopiedProvider(null), 1800);
    } catch {
      setNotice({ kind: 'error', text: 'ဖုန်းနံပါတ်ကို ကူးယူ၍မရပါ။ ကိုယ်တိုင်မှတ်သားပါ။' });
    }
  };

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
      setNotice({ kind: 'success', text: 'ပိုက်ဆံအိတ် လက်ကျန်ငွေ အသစ်ပြန်လည် ရယူပြီးပါပြီ။' });
    } catch {
      // Ignored
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const submitDeposit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);

    const cleanPhone = senderPhone.trim();
    const cleanTxId = transferId.trim();

    if (!cleanPhone || !cleanTxId) {
      setNotice({ kind: 'error', text: 'လွှဲသူဖုန်းနံပါတ်နှင့် ငွေလွှဲ ID အပြည့်အစုံ ဖြည့်သွင်းပါ။' });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onCreateDeposit(cleanPhone, cleanTxId);
      setNotice({
        kind: 'success',
        text: result.message || 'ငွေသွင်းတောင်းဆိုမှုကို စစ်ဆေးရန် တင်သွင်းပြီးပါပြီ။ ခေတ္တစောင့်ဆိုင်းပေးပါ။',
      });
      setSenderPhone('');
      setTransferId('');
      setSelectedPreset(null);
      if (onRefresh) onRefresh();
    } catch (error) {
      setNotice({ kind: 'error', text: (error as Error).message || 'တောင်းဆိုမှုကို ပေးပို့၍မရပါ။ ပြန်လည်စမ်းသပ်ပါ။' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitWithdrawal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    const amount = Number(withdrawAmount.replace(/[ ,]/g, ''));
    const cleanPhone = withdrawPhone.trim();

    if (isNaN(amount) || amount < 1000) {
      setNotice({ kind: 'error', text: 'ငွေထုတ်ပမာဏသည် အနည်းဆုံး ၁,၀၀၀ MMK ဖြစ်ရပါမည်။' });
      return;
    }

    if (amount > availableBalance) {
      setNotice({
        kind: 'error',
        text: `လက်ကျန်ငွေ မလုံလောက်ပါ။ ရရှိနိုင်သောလက်ကျန်: ${formatMMK(availableBalance)} ဖြစ်ပါသည်။`,
      });
      return;
    }

    if (!cleanPhone) {
      setNotice({ kind: 'error', text: 'လက်ခံမည့် ဖုန်းနံပါတ် ဖြည့်သွင်းပါ။' });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onCreateWithdrawal(amount, cleanPhone);
      setNotice({
        kind: 'success',
        text: result.message || 'ငွေထုတ်တောင်းဆိုမှုကို စာရင်းသွင်းပြီးပါပြီ။ စီမံခန့်ခွဲသူက လွှဲပြောင်းပေးပါမည်။',
      });
      setWithdrawAmount('');
      setWithdrawPhone('');
      if (onRefresh) onRefresh();
    } catch (error) {
      setNotice({ kind: 'error', text: (error as Error).message || 'ငွေထုတ်တောင်းဆိုမှု မအောင်မြင်ပါ။' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: 'deposit' as const, label: 'ငွေသွင်း (Deposit)', icon: ArrowDownCircle },
    { id: 'withdraw' as const, label: 'ငွေထုတ် (Withdraw)', icon: ArrowUpCircle },
    { id: 'history' as const, label: 'တောင်းဆိုမှုမှတ်တမ်း', icon: Clock3 },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-3 pb-24 pt-4 sm:px-6 sm:pt-6 font-sans">
      {/* 1. TOP HERO BALANCE CARD */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#621822] via-[#7a1f2b] to-[#983545] p-6 text-white shadow-xl border border-amber-300/40">
        {/* Decorative corner orb */}
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 h-36 w-36 rounded-full bg-white/5 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-200/90">
              <Wallet className="h-4 w-4 text-amber-300" />
              <span>AzLottery အဓိက ပိုက်ဆံအိတ်</span>
            </div>
            <p className="mt-2 text-3xl font-black tracking-tight sm:text-5xl text-white font-mono drop-shadow-sm">
              {formatMMK(availableBalance)}
            </p>
            {reservedBalance > 0 && (
              <p className="mt-2 text-xs font-semibold text-amber-200/80 bg-white/10 px-2.5 py-1 rounded-lg w-fit border border-white/10">
                စစ်ဆေးဆဲငွေထုတ် Reserve: {formatMMK(reservedBalance)}
              </p>
            )}
          </div>

          {onRefresh && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 px-3.5 py-2 text-xs font-bold text-white transition-all border border-white/20 backdrop-blur-xs cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'ရယူနေသည်…' : 'လက်ကျန် ပြန်စစ်ရန်'}</span>
            </button>
          )}
        </div>

        {/* 3 Main Action Tabs */}
        <div className="relative z-10 mt-6 grid grid-cols-3 gap-2 rounded-2xl bg-black/20 p-1.5 backdrop-blur-sm border border-white/10">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setActiveTab(id);
                setNotice(null);
              }}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-2 text-xs font-black transition-all cursor-pointer ${
                activeTab === id
                  ? 'bg-white text-[#7a1f2b] shadow-md shadow-black/10 scale-[1.02]'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 2. NOTICE TOAST / BANNER */}
      {notice && (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-start gap-3 rounded-2xl p-4 text-xs font-bold shadow-sm border transition-all ${
            notice.kind === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}
        >
          {notice.kind === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span className="flex-1 leading-5">{notice.text}</span>
          <button
            onClick={() => setNotice(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3. DEPOSIT TAB */}
      {activeTab === 'deposit' && (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left Form: Deposit Request */}
          <section className="rounded-3xl bg-white p-5 sm:p-7 shadow-md border border-slate-200/80 space-y-5">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#7a1f2b] bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                DEPOSIT REQUEST
              </span>
              <h1 className="mt-1 text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                ငွေသွင်းတောင်းဆိုရန်
              </h1>
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                အောက်ဖော်ပြပါ တရားဝင်လက်ခံအကောင့်များသို့ ငွေလွှဲပြီးပါက လွှဲသူဖုန်းနံပါတ်နှင့် ငွေလွှဲပြေစာ ID ကို ဖြည့်သွင်း၍ အတည်ပြုပေးပို့ပါ။
              </p>
            </div>

            {/* Quick Amount Suggestion Buttons */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                ရည်ညွှန်း ငွေသွင်းပမာဏ (MMK)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PRESET_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setSelectedPreset(amt)}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${
                      selectedPreset === amt
                        ? 'bg-[#7a1f2b] text-white border-[#7a1f2b] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {amt.toLocaleString()} K
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={submitDeposit} className="space-y-4 pt-1">
              {/* Sender Phone */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  ငွေလွှဲခဲ့သည့် ဖုန်းနံပါတ် <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <PhoneCall className="h-4 w-4" />
                  </div>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    placeholder="09xxxxxxxxx"
                    required
                    maxLength={24}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/70 py-2.5 pl-10 pr-4 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-[#7a1f2b] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7a1f2b]/20 transition-all"
                  />
                </div>
              </div>

              {/* Transfer ID */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  ငွေလွှဲ Transaction ID (သို့) နောက်ဆုံး ဂဏန်းများ <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    autoComplete="off"
                    value={transferId}
                    onChange={(e) => setTransferId(e.target.value)}
                    placeholder="ဥပမာ: 20261030998124 (သို့မဟုတ်) ပြေစာ ID"
                    required
                    minLength={4}
                    maxLength={128}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/70 py-2.5 pl-10 pr-4 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-[#7a1f2b] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7a1f2b]/20 transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  * KPay/WavePay ပြေစာပေါ်ရှိ Transaction ID အပြည့်အစုံကို ထည့်ပေးပါက ပိုမိုမြန်ဆန်စွာ စစ်ဆေးအတည်ပြုနိုင်ပါသည်။
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-gradient-to-r from-[#6b1924] via-[#7a1f2b] to-[#983545] py-3 px-4 text-sm font-black text-white shadow-md shadow-rose-900/20 hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>ပေးပို့နေပါသည်…</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>ငွေသွင်းတောင်းဆိုချက် ပေးပို့မည်</span>
                  </>
                )}
              </button>
            </form>
          </section>

          {/* Right Sidebar: Receiver Accounts */}
          <aside className="space-y-4">
            <section className="rounded-3xl bg-white p-5 sm:p-6 shadow-md border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    PAYMENT RECEIVERS
                  </span>
                  <h2 className="text-base font-black text-slate-800 flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-[#7a1f2b]" />
                    <span>တရားဝင် ငွေလက်ခံအကောင့်များ</span>
                  </h2>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                  ACTIVE
                </span>
              </div>

              <div className="space-y-2.5">
                {displayProviders.map((provider) => {
                  const isCopied = copiedProvider === provider.code;
                  return (
                    <div
                      key={provider.code}
                      className="group flex items-center justify-between p-3.5 rounded-2xl border border-slate-200/90 bg-gradient-to-r from-slate-50 to-white hover:border-[#7a1f2b]/40 hover:shadow-xs transition-all"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#7a1f2b] bg-rose-50 px-1.5 py-0.5 rounded">
                          {provider.name}
                        </span>
                        <p className="mt-1 font-mono text-base font-black text-slate-900 tracking-wide select-all">
                          {provider.receiver_phone}
                        </p>
                        <p className="text-xs font-medium text-slate-500">
                          {provider.receiver_name}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => copyReceiver(provider.receiver_phone, provider.code)}
                        className={`inline-flex items-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          isCopied
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white text-[#7a1f2b] border border-slate-200 group-hover:border-[#7a1f2b] group-hover:bg-[#7a1f2b] group-hover:text-white'
                        }`}
                        title="ဖုန်းနံပါတ် ကူးယူရန်"
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>ကူးပြီး</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>ကူးယူရန်</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Safety notice */}
              <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200/80 p-3 text-[11px] font-medium text-amber-900 leading-relaxed">
                <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  ငွေမလွှဲမီ အထက်ပါ တရားဝင်အကောင့်အမည်နှင့် ဖုန်းနံပါတ်ကို သေချာစွာ စစ်ဆေးပါ။ လွှဲပြီးပါက ပြေစာ Transaction ID ဖြင့် ချက်ချင်း တင်သွင်းပါ။
                </p>
              </div>
            </section>
          </aside>
        </div>
      )}

      {/* 4. WITHDRAW TAB */}
      {activeTab === 'withdraw' && (
        <section className="mx-auto w-full max-w-xl rounded-3xl bg-white p-5 sm:p-8 shadow-md border border-slate-200/80 space-y-6">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#7a1f2b] bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
              WITHDRAWAL REQUEST
            </span>
            <h1 className="mt-1 text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              ငွေထုတ်တောင်းဆိုရန်
            </h1>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              ပိုက်ဆံအိတ်ထဲမှ အနိုင်ရငွေကို သင့် KPay / WavePay အကောင့်သို့ လျင်မြန်စွာ လွှဲပြောင်းရယူနိုင်ပါသည်။
            </p>
          </div>

          {/* Current Available Strip */}
          <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-600" />
              <span className="text-xs font-bold text-amber-900">လက်ရှိ ရရှိနိုင်သော လက်ကျန်</span>
            </div>
            <strong className="text-base sm:text-lg font-black text-amber-950 font-mono">
              {formatMMK(availableBalance)}
            </strong>
          </div>

          {/* Quick presets for withdrawal */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              ငွေထုတ်ယူမည့် ပမာဏ ရွေးချယ်မှု
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {[10000, 30000, 50000, 100000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setWithdrawAmount(String(amt))}
                  className="py-2 px-2 text-center rounded-xl text-xs font-extrabold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer"
                >
                  {amt.toLocaleString()} K
                </button>
              ))}
              <button
                type="button"
                onClick={() => setWithdrawAmount(String(availableBalance))}
                disabled={availableBalance < 1000}
                className="py-2 px-2 text-center rounded-xl text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 cursor-pointer disabled:opacity-40"
              >
                အားလုံးထုတ်မည်
              </button>
            </div>
          </div>

          <form onSubmit={submitWithdrawal} className="space-y-4">
            {/* Amount input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                ငွေထုတ်ပမာဏ (MMK) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="အနည်းဆုံး ၁,၀၀၀ MMK"
                  min={1000}
                  max={availableBalance}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/70 py-2.5 px-4 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-[#7a1f2b] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7a1f2b]/20 transition-all"
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-extrabold text-slate-400">
                  MMK
                </span>
              </div>
            </div>

            {/* Target Phone */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                ငွေလက်ခံမည့် ဖုန်းနံပါတ် (KPay / WavePay) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <PhoneCall className="h-4 w-4" />
                </div>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={withdrawPhone}
                  onChange={(e) => setWithdrawPhone(e.target.value)}
                  placeholder="09xxxxxxxxx"
                  required
                  maxLength={24}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/70 py-2.5 pl-10 pr-4 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-[#7a1f2b] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7a1f2b]/20 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || availableBalance < 1000}
              className="w-full rounded-xl bg-gradient-to-r from-[#6b1924] via-[#7a1f2b] to-[#983545] py-3 px-4 text-sm font-black text-white shadow-md shadow-rose-900/20 hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>တင်သွင်းနေပါသည်…</span>
                </>
              ) : (
                <>
                  <ArrowUpCircle className="h-4 w-4" />
                  <span>ငွေထုတ်တောင်းဆိုရန် အတည်ပြုမည်</span>
                </>
              )}
            </button>
          </form>
        </section>
      )}

      {/* 5. HISTORY TAB */}
      {activeTab === 'history' && (
        <section className="rounded-3xl bg-white p-5 sm:p-7 shadow-md border border-slate-200/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                REQUEST HISTORY
              </span>
              <h1 className="text-xl font-black text-slate-900">ငွေသွင်း/ငွေထုတ် တောင်းဆိုမှု မှတ်တမ်းများ</h1>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              {(['all', 'deposit', 'withdrawal'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setHistoryFilter(filter)}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    historyFilter === filter
                      ? 'bg-white text-[#7a1f2b] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {filter === 'all' ? 'အားလုံး' : filter === 'deposit' ? 'ငွေသွင်း' : 'ငွေထုတ်'}
                </button>
              ))}
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Clock3 className="mx-auto h-10 w-10 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">တောင်းဆိုမှု မှတ်တမ်း မရှိသေးပါ။</p>
              <p className="text-xs text-slate-400">ငွေသွင်း (သို့) ငွေထုတ် တောင်းဆိုမှု ပြုလုပ်နိုင်ပါသည်။</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredRequests.map((request) => {
                const isDeposit = request.kind === 'deposit';
                return (
                  <article
                    key={request.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 hover:bg-slate-50/70 transition-colors rounded-xl px-2"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          isDeposit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {isDeposit ? (
                          <ArrowDownCircle className="h-5 w-5" />
                        ) : (
                          <ArrowUpCircle className="h-5 w-5" />
                        )}
                      </span>

                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-xs font-black text-slate-900">
                            {isDeposit ? 'ငွေသွင်းတောင်းဆိုမှု' : 'ငွေထုတ်တောင်းဆိုမှု'}
                          </strong>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${
                              statusBadgeClasses[request.status]
                            }`}
                          >
                            {statusText[request.status]}
                          </span>
                        </div>

                        <p className="mt-0.5 text-xs text-slate-500 font-mono">
                          {isDeposit
                            ? `ပြေစာ ID: ${request.txn_id || request.transfer_id || '—'} · ဖုန်း: ${request.phone}`
                            : `ထုတ်ယူမည့်ဖုန်း: ${request.account_number || request.phone || '—'}`}
                        </p>

                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {request.created_at ? new Date(request.created_at).toLocaleString('my-MM') : '—'}
                          {request.admin_note && ` · မှတ်ချက်: ${request.admin_note}`}
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right pl-12 sm:pl-0">
                      <strong
                        className={`text-sm font-black font-mono ${
                          isDeposit ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {request.amount === null
                          ? 'စစ်ဆေးဆဲ'
                          : `${isDeposit ? '+' : '-'}${formatMMK(request.amount)}`}
                      </strong>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </main>
  );
};
