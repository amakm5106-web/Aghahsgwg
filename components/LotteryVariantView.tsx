'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
  ArrowLeft,
  Clock3,
  HelpCircle,
  RefreshCw,
  Volume2,
  VolumeX,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Sparkles,
  Trophy,
  CheckCircle2,
  AlertCircle,
  History,
  RotateCw,
} from 'lucide-react';
import type { User } from '@/lib/store';
import { determineK3AutoWin, determine5DAutoWin, determineTRXAutoWin } from '@/lib/autowin';

type Variant = 'k3' | '5d' | 'trx';

interface Config {
  label: string;
  subtitle: string;
  periods: number[];
  options: { key: string; label: string; desc: string; color: string }[];
  icon: string;
}

const CONFIGS: Record<Variant, Config> = {
  k3: {
    label: 'K3 အံစာတုံး',
    subtitle: 'သုံးလုံးအံစာတုံး · Big / Small / Odd / Even',
    periods: [1, 3, 5, 10],
    options: [
      { key: 'Big', label: 'Big (ကြီး)', desc: 'ပေါင်းလဒ် ၁၁ မှ ၁၈', color: 'bg-amber-500 text-white' },
      { key: 'Small', label: 'Small (သေး)', desc: 'ပေါင်းလဒ် ၃ မှ ၁၀', color: 'bg-blue-500 text-white' },
      { key: 'Odd', label: 'Odd (မ)', desc: 'မဂဏန်းပေါင်းလဒ်', color: 'bg-emerald-500 text-white' },
      { key: 'Even', label: 'Even (စုံ)', desc: 'စုံဂဏန်းပေါင်းလဒ်', color: 'bg-violet-500 text-white' },
    ],
    icon: '/cklottery/lotterycategory/k3.png',
  },
  '5d': {
    label: '5D ဂဏန်းငါးလုံး',
    subtitle: 'ဂဏန်း ၅ လုံး · Big / Small / Odd / Even',
    periods: [1, 3, 5, 10],
    options: [
      { key: 'Big', label: 'Big (ကြီး)', desc: 'နောက်ဆုံးဂဏန်း ၅ မှ ၉', color: 'bg-amber-500 text-white' },
      { key: 'Small', label: 'Small (သေး)', desc: 'နောက်ဆုံးဂဏန်း ၀ မှ ၄', color: 'bg-blue-500 text-white' },
      { key: 'Odd', label: 'Odd (မ)', desc: 'မဂဏန်း (၁, ၃, ၅, ၇, ၉)', color: 'bg-emerald-500 text-white' },
      { key: 'Even', label: 'Even (စုံ)', desc: 'စုံဂဏန်း (၀, ၂, ၄, ၆, ၈)', color: 'bg-violet-500 text-white' },
    ],
    icon: '/cklottery/lotterycategory/5d.png',
  },
  trx: {
    label: 'Trx Win ထီ',
    subtitle: 'Blockchain Hash · Color / Size',
    periods: [1, 3, 5, 10],
    options: [
      { key: 'Green', label: 'Green (အစိမ်း)', desc: 'အရောင် ၁, ၃, ၇, ၉', color: 'bg-emerald-500 text-white' },
      { key: 'Red', label: 'Red (အနီ)', desc: 'အရောင် ၀, ၂, ၄, ၆, ၈', color: 'bg-rose-500 text-white' },
      { key: 'Big', label: 'Big (ကြီး)', desc: 'အရွယ်အစား ၅ မှ ၉', color: 'bg-amber-500 text-white' },
      { key: 'Small', label: 'Small (သေး)', desc: 'အရွယ်အစား ၀ မှ ၄', color: 'bg-blue-500 text-white' },
    ],
    icon: '/cklottery/lotterycategory/trx-win.png',
  },
};

interface LotteryVariantViewProps {
  variant: Variant;
  currentUser: User;
  onPlaceBet: (
    variant: 'k3' | '5d' | 'trx',
    interval: number,
    periodId: string,
    selection: string,
    stakeMMK: number
  ) => { success: boolean; newBalance: number };
  onSettleWin: (
    variant: 'k3' | '5d' | 'trx',
    periodId: string,
    selection: string,
    payoutMMK: number,
    result: string
  ) => void;
  onNavigate: (tab: string) => void;
}

interface RoundHistoryItem {
  periodId: string;
  result: string;
  summary: string;
  time: string;
}

interface UserVariantBet {
  id: string;
  periodId: string;
  selection: string;
  stake: number;
  payout: number;
  status: 'pending' | 'won' | 'lost';
  time: string;
}

export const LotteryVariantView: React.FC<LotteryVariantViewProps> = ({
  variant,
  currentUser,
  onPlaceBet,
  onSettleWin,
  onNavigate,
}) => {
  const config = CONFIGS[variant];
  const [periodMinutes, setPeriodMinutes] = useState<number>(config.periods[0]);
  const [secondsLeft, setSecondsLeft] = useState<number>(config.periods[0] * 60);
  const [periodId, setPeriodId] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [baseUnit, setBaseUnit] = useState<number>(1000);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [historyTab, setHistoryTab] = useState<'results' | 'mybets'>('results');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // History & Active Bets
  const [roundHistory, setRoundHistory] = useState<RoundHistoryItem[]>([]);
  const [myBets, setMyBets] = useState<UserVariantBet[]>([]);
  const [celebrationWin, setCelebrationWin] = useState<{
    periodId: string;
    result: string;
    summary: string;
    selection: string;
    stake: number;
    payout: number;
  } | null>(null);
  const [recentSettledPeriodId, setRecentSettledPeriodId] = useState<string | null>(null);

  const lastSettledRef = useRef<string>('');

  // Audio beeps
  const playSound = useCallback((freq = 580, duration = 0.08) => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      /* ignore audio blocked */
    }
  }, [soundEnabled]);

  // Compute Period ID & seconds
  const computePeriod = useCallback((intervalMins: number) => {
    const durationSeconds = intervalMins * 60;
    const now = Math.floor(Date.now() / 1000);
    const slot = Math.floor(now / durationSeconds);
    const end = (slot + 1) * durationSeconds;
    const remaining = Math.max(0, end - now);

    const d = new Date(slot * durationSeconds * 1000);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const daySlot = Math.floor((slot * durationSeconds - Math.floor(new Date(Date.UTC(yyyy, d.getUTCMonth(), d.getUTCDate())).getTime() / 1000)) / durationSeconds) + 1;
    const code = String(intervalMins).padStart(2, '0');
    const pId = `${yyyy}${mm}${dd}${code}${String(daySlot).padStart(4, '0')}`;

    return { periodId: pId, secondsLeft: remaining };
  }, []);

  // Generate result value for a period
  // Generate result value for a period using Auto-Win algorithm (least-bet side wins)
  const generateResult = useCallback((v: Variant, _pId: string, currentBets: UserVariantBet[]) => {
    const betInputs = currentBets.map((b) => ({ selection: b.selection, stake: b.stake }));
    if (v === 'k3') {
      const autoRes = determineK3AutoWin(betInputs);
      const [d1, d2, d3] = autoRes.dice;
      const sum = autoRes.sum;
      const isBig = sum >= 11;
      const isOdd = sum % 2 === 1;
      return {
        result: `${d1}, ${d2}, ${d3}`,
        sum,
        summary: autoRes.summary,
        checkWin: (pick: string) => {
          if (pick === 'Big') return isBig;
          if (pick === 'Small') return !isBig;
          if (pick === 'Odd') return isOdd;
          if (pick === 'Even') return !isOdd;
          return false;
        },
      };
    }
    if (v === '5d') {
      const autoRes = determine5DAutoWin(betInputs);
      const digits = autoRes.digits;
      const last = autoRes.lastDigit;
      const isBig = last >= 5;
      const isOdd = last % 2 === 1;
      return {
        result: digits.join(' '),
        sum: last,
        summary: autoRes.summary,
        checkWin: (pick: string) => {
          if (pick === 'Big') return isBig;
          if (pick === 'Small') return !isBig;
          if (pick === 'Odd') return isOdd;
          if (pick === 'Even') return !isOdd;
          return false;
        },
      };
    }
    // TRX Win
    const autoRes = determineTRXAutoWin(betInputs);
    const trxNum = autoRes.resultNum;
    const isGreen = [1, 3, 7, 9].includes(trxNum) || trxNum === 5;
    const isBig = trxNum >= 5;
    return {
      result: String(trxNum),
      sum: trxNum,
      summary: autoRes.summary,
      checkWin: (pick: string) => {
        if (pick === 'Green') return isGreen;
        if (pick === 'Red') return !isGreen;
        if (pick === 'Big') return isBig;
        if (pick === 'Small') return !isBig;
        return false;
      },
    };
  }, []);

  // Timer Tick
  useEffect(() => {
    const update = () => {
      const p = computePeriod(periodMinutes);
      setPeriodId(p.periodId);
      setSecondsLeft(p.secondsLeft);

      // Audio countdown in last 5 seconds
      if (p.secondsLeft <= 5 && p.secondsLeft > 0) {
        playSound(440, 0.05);
      }

      // Settle round when hit 0
      if (p.secondsLeft === 0 && lastSettledRef.current !== p.periodId) {
        lastSettledRef.current = p.periodId;
        const currentPendingBets = myBets.filter((b) => b.periodId === p.periodId && b.status === 'pending');
        const res = generateResult(variant, p.periodId, currentPendingBets);
        setRecentSettledPeriodId(p.periodId);
        setTimeout(() => setRecentSettledPeriodId(null), 8000);

        // Add to history
        const historyEntry: RoundHistoryItem = {
          periodId: p.periodId,
          result: res.result,
          summary: res.summary,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
        setRoundHistory((prev) => [historyEntry, ...prev.slice(0, 20)]);

        // Check user bets
        setMyBets((prevBets) =>
          prevBets.map((b) => {
            if (b.periodId === p.periodId && b.status === 'pending') {
              const won = res.checkWin(b.selection);
              const payout = won ? b.stake * 2 : 0;
              if (won) {
                onSettleWin(variant, p.periodId, b.selection, payout, res.result);
                playSound(880, 0.25);
                setCelebrationWin({
                  periodId: p.periodId,
                  result: res.result,
                  summary: res.summary,
                  selection: b.selection,
                  stake: b.stake,
                  payout,
                });
                setFeedback({
                  type: 'success',
                  message: `🎉 ကာလ #${p.periodId.slice(-6)} တွင် ${b.selection} ရွေးချယ်မှုဖြင့် +${payout.toLocaleString()} MMK အနိုင်ရရှိပါသည်!`,
                });
              } else {
                setFeedback({
                  type: 'error',
                  message: `ကာလ #${p.periodId.slice(-6)} ရလဒ်: ${res.result} (${res.summary})`,
                });
              }
              return {
                ...b,
                status: won ? 'won' : 'lost',
                payout,
              };
            }
            return b;
          })
        );
      }
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [computePeriod, generateResult, onSettleWin, periodMinutes, playSound, variant]);

  const bettingOpen = secondsLeft > 5;
  const minutes = Math.floor(secondsLeft / 60);
  const remSecs = secondsLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(remSecs).padStart(2, '0')}`;

  const totalStake = baseUnit * multiplier;

  const handleConfirmBet = () => {
    if (!selectedOption) {
      setFeedback({ type: 'error', message: 'လောင်းကြေးရွေးချယ်မှု တစ်ခု အရင်ရွေးချယ်ပါ' });
      return;
    }
    if (!bettingOpen) {
      setFeedback({ type: 'error', message: 'ဤကာလ၏ လောင်းကြေးပိတ်ချိန် ရောက်ရှိသွားပါပြီ။ နောက်ကာလကို စောင့်ပါ။' });
      return;
    }
    if (currentUser.wallet_balance < totalStake) {
      setFeedback({ type: 'error', message: `လောင်းကြေးအတွက် လက်ကျန်ငွေ မလုံလောက်ပါ။ (လိုအပ်ချက်: ${totalStake.toLocaleString()} MMK)` });
      return;
    }

    try {
      onPlaceBet(variant, periodMinutes, periodId, selectedOption, totalStake);
      playSound(660, 0.1);

      const newBet: UserVariantBet = {
        id: `bet_${Date.now()}`,
        periodId,
        selection: selectedOption,
        stake: totalStake,
        payout: 0,
        status: 'pending',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMyBets((prev) => [newBet, ...prev]);

      setFeedback({
        type: 'success',
        message: `${totalStake.toLocaleString()} MMK (${selectedOption}) လောင်းကြေး အောင်မြင်စွာ တင်ပြီးပါပြီ!`,
      });
      setSelectedOption(null);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'လောင်းကြေး မအောင်မြင်ပါ။' });
    }
  };

  const handleRefreshBalance = () => {
    setIsRefreshing(true);
    playSound(520, 0.05);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const stakeUnits = [100, 500, 1000, 5000, 10000, 50000];
  const multOptions = [1, 5, 10, 20, 50];

  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-[#f4f7fb] text-slate-800 pb-16 flex flex-col shadow-lg border-x border-slate-200">
      {/* Top Header */}
      <header className="bg-gradient-to-r from-[#2f74ed] to-[#4f9cff] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h1 className="text-base font-black tracking-tight">{config.label}</h1>
          <span className="text-[10px] text-blue-100 font-medium block">{config.subtitle}</span>
        </div>

        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Sound"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </header>

      {/* 1. SHARED UNIFIED WALLET BALANCE CARD (Identical to WinGo & Wallet) */}
      <section className="bg-gradient-to-b from-[#4f9cff] to-[#f4f7fb] pt-3 pb-2 px-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
              <div className="w-5 h-5 rounded-full bg-blue-50 text-[#7a1f2b] flex items-center justify-center">
                <Wallet className="w-3 h-3" />
              </div>
              <span>ပိုက်ဆံအိတ် လက်ကျန်ငွေ</span>
            </div>

            <button
              type="button"
              onClick={handleRefreshBalance}
              className={`text-slate-400 hover:text-blue-500 p-1 cursor-pointer transition-transform ${
                isRefreshing ? 'animate-spin text-blue-500' : ''
              }`}
              title="လက်ကျန်ငွေ Refresh လုပ်ရန်"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Unified Balance Figure */}
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 tracking-tight">
              K{currentUser.wallet_balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              MMK (တရားဝင်)
            </span>
          </div>

          {/* Action Buttons: Withdraw & Deposit */}
          <div className="grid grid-cols-2 gap-2.5 mt-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onNavigate('wallet')}
              className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowUpCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>ငွေထုတ်ယူမည်</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('wallet')}
              className="py-2 px-3 rounded-xl bg-[#7a1f2b] hover:bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <ArrowDownCircle className="w-3.5 h-3.5" />
              <span>ငွေသွင်းမည်</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="px-3 space-y-3 flex-1">
        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2 shadow-xs border animate-in fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-700 p-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* 2. PERIOD SELECTOR TABS */}
        <section className="bg-white rounded-2xl p-1.5 shadow-xs border border-slate-200/80">
          <div className="grid grid-cols-4 gap-1">
            {config.periods.map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => {
                  setPeriodMinutes(period);
                  setSelectedOption(null);
                }}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  periodMinutes === period
                    ? 'bg-[#7a1f2b] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {period} Min
              </button>
            ))}
          </div>
        </section>

        {/* 3. DRAW COUNTDOWN & PERIOD BANNER */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2f74ed] via-[#3d83f5] to-[#59aaff] p-4 text-white shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-100 tracking-wider block">
                လက်ရှိ ကာလ (Current Period)
              </span>
              <strong className="text-sm font-mono font-bold tracking-wider text-white">
                #{periodId || '············'}
              </strong>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-blue-100 font-bold block flex items-center justify-end gap-1">
                <Clock3 className="w-3 h-3" />
                <span>ကျန်ရှိချိန်</span>
              </span>
              <div className="flex items-center gap-1 font-mono font-black text-xl tracking-widest mt-0.5">
                <span className="bg-black/25 px-1.5 py-0.5 rounded text-amber-300">{timeFormatted.slice(0, 2)}</span>
                <span>:</span>
                <span className={`bg-black/25 px-1.5 py-0.5 rounded ${secondsLeft <= 5 ? 'text-rose-400 animate-pulse' : 'text-amber-300'}`}>
                  {timeFormatted.slice(3, 5)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-white/20">
            <div className="flex items-center gap-2">
              <Image src={config.icon} alt={config.label} width={36} height={36} className="object-contain" />
              <div>
                <span className="text-xs font-bold block">{config.label} ကံစမ်းမှု</span>
                <span className="text-[10px] text-blue-100 block">
                  {bettingOpen ? '● လောင်းကြေးဖွင့်လှစ်ထားသည်' : '✕ လောင်းကြေးပိတ်ချိန် (၅ စက္ကန့်)'}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-blue-100 block">ဆုကြေးနှုန်းထား</span>
              <strong className="text-xs font-black text-amber-300">၂ ဆ (2× Payout)</strong>
            </div>
          </div>
        </section>

        {/* 4. PLAY SELECTION CARDS */}
        <section className="bg-white rounded-2xl p-3.5 shadow-xs border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#7a1f2b]" />
              <span>ခန့်မှန်းရွေးချယ်မှု ပြုလုပ်ပါ</span>
            </h2>
            <span className="text-[10px] text-slate-500 font-medium">၁ မျိုး ရွေးချယ်နိုင်သည်</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {config.options.map((opt) => {
              const isSelected = selectedOption === opt.key;

              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSelectedOption(opt.key)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                    isSelected
                      ? 'border-[#7a1f2b] bg-blue-50/70 shadow-xs ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900">{opt.label}</span>
                    <span className="text-[10px] font-extrabold text-[#7a1f2b] bg-blue-100/60 px-1.5 py-0.5 rounded">
                      2×
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">{opt.desc}</span>
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#7a1f2b]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Stake & Multiplier Selector */}
          <div className="pt-2 border-t border-slate-100 space-y-2.5">
            <div>
              <span className="text-[11px] font-bold text-slate-600 block mb-1">လောင်းကြေး ပမာဏ (MMK)</span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {stakeUnits.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setBaseUnit(amt)}
                    className={`py-1.5 px-1 rounded-lg text-[11px] font-bold text-center transition-all cursor-pointer ${
                      baseUnit === amt
                        ? 'bg-[#7a1f2b] text-white shadow-xs'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                    }`}
                  >
                    {amt >= 1000 ? `${amt / 1000}K` : amt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-600 block mb-1">အဆ (Multiplier)</span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                {multOptions.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMultiplier(m)}
                    className={`py-1 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      multiplier === m
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {m}×
                  </button>
                ))}
              </div>
            </div>

            {/* Total Stake Summary Row */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">စုစုပေါင်း လောင်းကြေး:</span>
              <div className="flex items-baseline gap-1">
                <span className="font-mono font-black text-slate-900 text-sm">
                  {totalStake.toLocaleString()}
                </span>
                <span className="text-[10px] font-bold text-blue-600">MMK</span>
              </div>
            </div>

            {/* Confirm Bet Button */}
            <button
              type="button"
              onClick={handleConfirmBet}
              disabled={!bettingOpen || !selectedOption}
              className={`w-full py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                !bettingOpen || !selectedOption
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#2f74ed] to-[#4f9cff] hover:opacity-95 text-white shadow-blue-500/25'
              }`}
            >
              <span>
                {!selectedOption
                  ? 'အပေါ်မှ ရွေးချယ်မှု တစ်ခု အရင်နှိပ်ပါ'
                  : !bettingOpen
                  ? 'လောင်းကြေးပိတ်ချိန် ရောက်ရှိနေပါသည်'
                  : `${selectedOption} ဖြင့် ${totalStake.toLocaleString()} MMK လောင်းကြေး အတည်ပြုမည်`}
              </span>
            </button>
          </div>
        </section>

        {/* 5. HISTORY & MY BETS TABS */}
        <section className="bg-white rounded-2xl p-3.5 shadow-xs border border-slate-200/80 space-y-3">
          {/* Live Indicator Header */}
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-black text-emerald-800 tracking-wide uppercase">
                ● LIVE ကာလရလဒ်မှတ်တမ်း (အချိန်နှင့်တစ်ပြေးညီ မွမ်းမံမှု)
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
              ကာလ #{periodId.slice(-6)}
            </span>
          </div>

          <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
            <button
              type="button"
              onClick={() => setHistoryTab('results')}
              className={`text-xs font-bold pb-1 transition-colors cursor-pointer ${
                historyTab === 'results'
                  ? 'text-[#7a1f2b] border-b-2 border-[#7a1f2b]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ဆာဗာ ရလဒ်မှတ်တမ်း
            </button>
            <button
              type="button"
              onClick={() => setHistoryTab('mybets')}
              className={`text-xs font-bold pb-1 transition-colors cursor-pointer ${
                historyTab === 'mybets'
                  ? 'text-[#7a1f2b] border-b-2 border-[#7a1f2b]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ကျွန်ုပ်၏ လောင်းကြေးများ ({myBets.length})
            </button>
          </div>

          {historyTab === 'results' ? (
            <div className="space-y-2">
              {roundHistory.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  ဤဂိမ်းကာလ ပြီးဆုံးချိန်တွင် ရလဒ်များ အလိုအလျောက် ထွက်ပေါ်လာပါမည်။
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {roundHistory.map((item) => {
                    const isJustSettled = item.periodId === recentSettledPeriodId;
                    return (
                      <div
                        key={item.periodId}
                        className={`py-2 px-1 flex items-center justify-between text-xs rounded-lg transition-all ${
                          isJustSettled ? 'bg-emerald-50 ring-1 ring-emerald-400 font-bold' : ''
                        }`}
                      >
                        <div>
                          <span className="font-mono text-slate-500 text-[11px] flex items-center gap-1">
                            #{item.periodId.slice(-6)}
                            {isJustSettled && (
                              <span className="text-[8px] font-black bg-emerald-600 text-white px-1 rounded animate-pulse">
                                LIVE
                              </span>
                            )}
                          </span>
                          <span className="font-bold text-slate-800">{item.summary}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-slate-900 font-bold bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {item.result}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{item.time}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {myBets.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  လောင်းကြေးမှတ်တမ်း မရှိသေးပါ။
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {myBets.map((b) => {
                    const isJustSettled = b.periodId === recentSettledPeriodId;
                    return (
                      <div
                        key={b.id}
                        className={`py-2 px-1 flex items-center justify-between text-xs rounded-lg transition-all ${
                          isJustSettled ? 'bg-emerald-50 ring-1 ring-emerald-400 font-bold' : ''
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800">{b.selection}</span>
                            <span className="text-[10px] font-mono text-slate-400">
                              #{b.periodId.slice(-6)}
                            </span>
                            {isJustSettled && (
                              <span className="text-[8px] font-black bg-emerald-600 text-white px-1 rounded">
                                LIVE
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-600 font-mono font-bold">
                            {b.stake.toLocaleString()} MMK
                          </span>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              b.status === 'won'
                                ? 'bg-emerald-100 text-emerald-800'
                                : b.status === 'lost'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-amber-100 text-amber-800 animate-pulse'
                            }`}
                          >
                            {b.status === 'won'
                              ? `🟢 +${b.payout.toLocaleString()} MMK နိုင်`
                              : b.status === 'lost'
                              ? '🔴 မနိုင်ပါ'
                              : '🟡 စောင့်ဆိုင်းဆဲ'}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{b.time}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* CELEBRATION WIN MODAL (အနိုင်ရလဒ်ကို သေချာ ပြသသော MODAL) */}
      {celebrationWin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setCelebrationWin(null)}
        >
          <div
            className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-amber-50 via-white to-amber-50/50 p-6 shadow-2xl border-2 border-amber-400 text-center space-y-4 animate-in zoom-in-95 duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close X */}
            <button
              onClick={() => setCelebrationWin(null)}
              className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
            >
              ✕
            </button>

            {/* Glowing Trophy Badge */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-white shadow-lg shadow-amber-500/30 animate-bounce">
              <span className="text-3xl">🏆</span>
            </div>

            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-700 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                WINNER CONGRATULATIONS!
              </span>
              <h2 className="mt-2 text-xl font-black text-slate-900 tracking-tight">
                ဂုဏ်ယူပါသည်! သင် အနိုင်ရပါသည်!
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {config.label} ကာလ #{celebrationWin.periodId.slice(-6)} တွင် ဆုကြေးငွေ ရရှိပါသည်
              </p>
            </div>

            {/* Winning Amount */}
            <div className="rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-600 p-4 text-white shadow-md shadow-emerald-700/25">
              <span className="text-[11px] font-bold text-emerald-100 block">စုစုပေါင်း အနိုင်ဆုကြေးငွေ</span>
              <p className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-amber-200 drop-shadow-sm mt-0.5">
                +{celebrationWin.payout.toLocaleString()} MMK
              </p>
            </div>

            {/* Breakdown */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2 text-left text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">ထွက်ရှိခဲ့သော ရလဒ်:</span>
                <strong className="text-slate-900 font-bold">{celebrationWin.summary}</strong>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">သင်ရွေးချယ်ခဲ့သည်:</span>
                <span className="font-bold text-[#7a1f2b]">{celebrationWin.selection}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">မူလလောင်းကြေး:</span>
                <span className="font-mono text-slate-700 font-bold">
                  {celebrationWin.stake.toLocaleString()} MMK (2× ဆုကြေး)
                </span>
              </div>
            </div>

            {/* Continue Button */}
            <button
              onClick={() => setCelebrationWin(null)}
              className="w-full rounded-xl bg-gradient-to-r from-[#6b1924] via-[#7a1f2b] to-[#983545] py-3 px-4 text-sm font-black text-white shadow-md shadow-rose-900/25 hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer"
            >
              ဆက်လက်ကစားမည် (Continue)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
