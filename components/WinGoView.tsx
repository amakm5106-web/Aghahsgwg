'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  WINGO_INTERVALS,
  type WinGoInterval,
  computeWinGoPeriod,
  getWinGoColors,
} from '@/lib/rules';
import type { User, WinGoBet, WinGoRoundResult } from '@/lib/store';
import {
  ChevronLeft,
  Headphones,
  Volume2,
  VolumeX,
  RotateCw,
  Wallet,
  Megaphone,
  Clock,
  HelpCircle,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

interface WinGoViewProps {
  currentUser: User;
  wingoBets: WinGoBet[];
  wingoHistory: WinGoRoundResult[];
  onPlaceBet: (
    interval: WinGoInterval,
    periodId: string,
    pickType: 'color' | 'size' | 'number',
    pickValue: string,
    stakeMMK: number
  ) => void;
  onSettleRound: (
    interval: WinGoInterval,
    periodId: string
  ) => {
    resultNumber: number;
    colors: ('green' | 'red' | 'violet')[];
    userWon?: boolean;
    totalPayout?: number;
    totalStake?: number;
    winningBets?: Array<{ pick_type: string; pick_value: string; stake: number; payout: number }>;
    userHadBets?: boolean;
  };
  onNavigate?: (tab: string) => void;
}

export const WinGoView: React.FC<WinGoViewProps> = ({
  currentUser,
  wingoBets,
  wingoHistory,
  onPlaceBet,
  onSettleRound,
  onNavigate,
}) => {
  // Intervals: 0.5 (30s), 1 (1Min), 3 (3Min), 5 (5Min)
  const [activeInterval, setActiveInterval] = useState<number>(0.5);
  const [recordTab, setRecordTab] = useState<'records' | 'chart' | 'myBets'>('records');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState<boolean>(false);
  const [supportModalOpen, setSupportModalOpen] = useState<boolean>(false);

  // Betting sheet state
  const [betDrawerOpen, setBetDrawerOpen] = useState<boolean>(false);
  const [selectedPick, setSelectedPick] = useState<{
    type: 'color' | 'size' | 'number';
    value: string;
    label: string;
    color: string;
  } | null>(null);

  // Multiplier pills: 1, 5, 10, 20, 50, 100
  const [baseUnit, setBaseUnit] = useState<number>(100);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Celebratory Win Modal state for showing exact winnings & result ball
  const [celebrationWin, setCelebrationWin] = useState<{
    periodId: string;
    resultNumber: number;
    colors: ('green' | 'red' | 'violet')[];
    totalPayout: number;
    totalStake: number;
    winningBets: Array<{ pick_type: string; pick_value: string; stake: number; payout: number }>;
  } | null>(null);
  const [recentSettledPeriodId, setRecentSettledPeriodId] = useState<string | null>(null);

  // Synchronized countdown timer
  const [secondsLeft, setSecondsLeft] = useState<number>(30);
  const [periodId, setPeriodId] = useState<string>('20261027100050158');
  const lastSettledRef = useRef<string>('');

  // Audio effects using authentic cklottery MP3s with Web Audio fallback
  const playCountdownAudio = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const audio = new Audio('/cklottery/mp3/di1-BcK6vZoZ.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => playBeep(640, 0.06));
    } catch {
      playBeep(640, 0.06);
    }
  };

  const playWinAudio = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const audio = new Audio('/cklottery/mp3/win-DVm17j99.mp3');
      audio.volume = 0.6;
      audio.play().catch(() => playBeep(880, 0.2));
    } catch {
      playBeep(880, 0.2);
    }
  };

  // Audio beep generator via Web Audio API
  const playBeep = (freq = 600, duration = 0.08) => {
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
      /* AudioContext may be blocked before interaction */
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const nowEpoch = Math.floor(Date.now() / 1000);
      const period = computeWinGoPeriod(activeInterval, nowEpoch);
      setSecondsLeft(period.secondsLeft);
      setPeriodId(period.periodId);

      // Countdown sound for last 5 seconds using cklottery audio
      if (period.secondsLeft <= 5 && period.secondsLeft > 0) {
        playCountdownAudio();
      }

      // Settle round when countdown hits 0
      if (period.secondsLeft === 0 && lastSettledRef.current !== period.periodId) {
        lastSettledRef.current = period.periodId;
        const res = onSettleRound(activeInterval, period.periodId);
        setRecentSettledPeriodId(period.periodId);
        setTimeout(() => setRecentSettledPeriodId(null), 9000);

        const winningSide = res.resultNumber >= 5 ? 'အကြီး (Big 5-9)' : 'အသေး (Small 0-4)';
        const colorName = res.colors.join('/');

        if (res.userWon && (res.totalPayout || 0) > 0) {
          playWinAudio();
          setCelebrationWin({
            periodId: period.periodId,
            resultNumber: res.resultNumber,
            colors: res.colors,
            totalPayout: res.totalPayout || 0,
            totalStake: res.totalStake || 0,
            winningBets: res.winningBets || [],
          });
          setFeedback({
            type: 'success',
            message: `🎉 ကာလ #${period.periodId.slice(-6)} တွင် +${(res.totalPayout || 0).toLocaleString()} MMK အနိုင်ရရှိပါသည်! ရလဒ်: ဂဏန်း ${res.resultNumber}`,
          });
        } else if (res.userHadBets) {
          playBeep(320, 0.15);
          setFeedback({
            type: 'error',
            message: `ကာလ #${period.periodId.slice(-6)} ရလဒ်: ဂဏန်း ${res.resultNumber} (${winningSide} · ${colorName})။ ဤတစ်ခေါက် ကံမကောင်းသေးပါ။`,
          });
        } else {
          setFeedback({
            type: 'success',
            message: `ကာလ #${period.periodId.slice(-6)} ရလဒ်: ဂဏန်း ${res.resultNumber} (${winningSide})`,
          });
        }
      }
    };

    updateTime();
    const timer = window.setInterval(updateTime, 1000);
    return () => window.clearInterval(timer);
  }, [activeInterval, onSettleRound, soundEnabled]);

  const bettingOpen = secondsLeft > 5;
  const minutes = Math.floor(secondsLeft / 60);
  const remSeconds = secondsLeft % 60;
  const m1 = Math.floor(minutes / 10);
  const m2 = minutes % 10;
  const s1 = Math.floor(remSeconds / 10);
  const s2 = remSeconds % 10;

  // Total stake calculation
  const totalStake = baseUnit * multiplier;

  // Filter history for current interval
  const historyForInterval = wingoHistory.filter(
    (h) => h.interval === activeInterval || (activeInterval === 0.5 && (h.interval === 0.5 || h.interval === 30))
  );

  // Top 5 balls shown in the lottery ticket
  const recentTopBalls = (historyForInterval.length > 0
    ? historyForInterval
    : wingoHistory
  ).slice(0, 5).map((h) => h.result_number);

  // Ensure fallback balls if empty
  const displayTopBalls = recentTopBalls.length >= 5 ? recentTopBalls : [2, 7, 4, 7, 1];

  // User bets for current interval
  const myBetsForInterval = wingoBets.filter(
    (b) => b.interval === activeInterval || (activeInterval === 0.5 && (b.interval === 0.5 || b.interval === 30))
  );

  // Handle open bet drawer
  const handleOpenBetDrawer = (type: 'color' | 'size' | 'number', value: string, label: string, color: string) => {
    playBeep(440, 0.05);
    setSelectedPick({ type, value, label, color });
    setBetDrawerOpen(true);
    setFeedback(null);
  };

  // Submit bet
  const handleConfirmBet = () => {
    if (!selectedPick) return;

    if (!bettingOpen) {
      setFeedback({ type: 'error', message: 'ဤကာလ၏ လောင်းကြေးပိတ်သွားပါပြီ။ နောက်ကာလကို စောင့်ပါ။' });
      return;
    }

    if (currentUser.wallet_balance < totalStake) {
      setFeedback({ type: 'error', message: 'လောင်းကြေးအတွက် MMK လက်ကျန်ငွေ မလုံလောက်ပါ။ ငွေသွင်းပါ!' });
      return;
    }

    try {
      onPlaceBet(activeInterval, periodId, selectedPick.type, selectedPick.value, totalStake);
      playBeep(800, 0.12);
      setFeedback({
        type: 'success',
        message: `${totalStake.toLocaleString()} MMK (${selectedPick.label}) လောင်းကြေး တင်ပြီးပါပြီ!`,
      });
      setBetDrawerOpen(false);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'လောင်းကြေး တင်သွင်းမှု မအောင်မြင်ပါ။' });
    }
  };

  const handleRefreshBalance = () => {
    setIsRefreshingBalance(true);
    playBeep(520, 0.05);
    setTimeout(() => {
      setIsRefreshingBalance(false);
    }, 600);
  };

  // Pagination for records table
  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(historyForInterval.length / itemsPerPage));
  const paginatedHistory = historyForInterval.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="wingo-shell w-full mx-auto min-h-screen pb-20 overflow-x-hidden font-sans">
      {/* 1. TOP BLUE HEADER BAR */}
      <header className="wingo-topbar text-white px-3 py-2.5 flex items-center justify-between sticky top-0 z-40">
        {/* Back Button */}
        <button
          onClick={() => (onNavigate ? onNavigate('home') : window.history.back())}
          className="p-1.5 hover:bg-white/15 rounded-full transition-colors flex items-center justify-center cursor-pointer"
          aria-label="Back"
        >
          <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
        </button>

        {/* AzLottery wordmark in center */}
        <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => onNavigate && onNavigate('home')}>
          <span className="text-lg sm:text-xl font-black tracking-tight text-white">AzLottery</span>
        </div>

        {/* Support & Sound Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSupportModalOpen(true)}
            className="p-1 hover:bg-white/15 rounded-full transition-colors cursor-pointer"
            aria-label="Customer Support"
            title="Customer Support"
          >
            <div className="relative w-5 h-5">
              <Image
                src="/cklottery/png/icon_sevice-BIWTN_cL.png"
                alt="Support"
                fill
                className="object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1 hover:bg-white/15 rounded-full transition-colors cursor-pointer"
            aria-label="Toggle Sound"
            title={soundEnabled ? 'Sound On' : 'Sound Off'}
          >
            <div className="relative w-5 h-5">
              <Image
                src={soundEnabled ? '/cklottery/png/sound-BIFuHXdZ.png' : '/cklottery/png/mute-YADtAPG2.png'}
                alt="Sound"
                fill
                className="object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </button>
        </div>
      </header>

      {/* BLUE WALLET HEADER AREA */}
      <div className="wingo-balance-wrap pb-7 pt-2 px-3 relative">
        {/* 2. FLOATING BALANCE CARD */}
        <div className="wingo-balance-card rounded-2xl p-4 flex flex-col items-center">
          {/* Balance Amount */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-black text-slate-800 tracking-tight font-mono">
              K{(currentUser?.wallet_balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <button
              onClick={handleRefreshBalance}
              className={`p-1 text-slate-400 hover:text-slate-600 transition-transform cursor-pointer ${
                isRefreshingBalance ? 'animate-spin text-blue-500' : ''
              }`}
              title="လက်ကျန်ငွေ ပြန်လည်စစ်ဆေးရန်"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          {/* Wallet Label */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1 mb-3.5">
            <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-blue-500">
              <Wallet className="w-2.5 h-2.5" />
            </div>
            <span>ပိုက်ဆံအိတ်လက်ကျန်</span>
          </div>

          {/* Two Big Action Buttons */}
          <div className="grid grid-cols-2 gap-3 w-full">
            {/* Withdraw Button */}
            <button
              onClick={() => onNavigate && onNavigate('wallet')}
              className="w-full py-2.5 px-4 rounded-full bg-[#f04438] hover:bg-[#e03126] active:scale-[0.98] transition-all text-white font-extrabold text-sm shadow-md shadow-red-500/20 text-center cursor-pointer"
            >
              ငွေထုတ်
            </button>

            {/* Deposit Button */}
            <button
              onClick={() => onNavigate && onNavigate('wallet')}
              className="w-full py-2.5 px-4 rounded-full bg-[#12b76a] hover:bg-[#0e9f5b] active:scale-[0.98] transition-all text-white font-extrabold text-sm shadow-md shadow-emerald-500/20 text-center cursor-pointer"
            >
              ငွေသွင်း
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="wingo-content px-3 pt-3 space-y-3">
        {/* 3. NOTICE / ANNOUNCEMENT TICKER */}
        <div className="wingo-notice bg-white rounded-full py-1.5 px-3 flex items-center gap-2">
          <div className="text-blue-500 shrink-0">
            <Megaphone className="w-4 h-4" />
          </div>
          <div className="overflow-hidden flex-1 whitespace-nowrap text-[11px] text-slate-600 font-medium">
            <div className="inline-block animate-marquee">
              မင်္ဂလာပါချစ်ရသောအဖွဲ့ဝင်များ၊ငွေသွင်းအမှားစာရင်းများကိုအမြန်ဆောင်ရွက်ပေးရန်အတွက် ငွေသွင်းငွေထုတ် ဝန်ဆောင်မှုကို ၂၄ နာရီ ဖွင့်လှစ်ထားပါသည်…
            </div>
          </div>
          <button
            onClick={() => setSupportModalOpen(true)}
            className="shrink-0 bg-[#7a1f2b] hover:bg-blue-700 text-white text-[10px] font-bold py-0.5 px-2.5 rounded-full cursor-pointer"
          >
            နောက်ထပ်
          </button>
        </div>

        {/* 4. WINGO PERIOD SELECTOR */}
        <div className="wingo-period-switch grid gap-1.5 rounded-2xl border bg-white p-2 shadow-sm">
          {WINGO_INTERVALS.map((interval) => (
            <button
              key={interval}
              onClick={() => {
                setActiveInterval(interval);
                playBeep(500, 0.05);
              }}
              className={`wingo-interval-button flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-2 transition-all cursor-pointer ${
                activeInterval === interval
                  ? 'active bg-gradient-to-b from-[#7a1f2b] to-[#3474ed] text-white shadow-md shadow-blue-500/25'
                  : 'bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span className={`flex h-7 w-7 items-center justify-center rounded-full ${
                activeInterval === interval ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                <Clock className="h-3.5 w-3.5" />
              </span>
              <span className="text-[10px] font-bold leading-tight">WinGo</span>
              <span className="text-[9px] font-semibold leading-tight opacity-90">{interval === 0.5 ? '30s' : `${interval}Min`}</span>
            </button>
          ))}
        </div>

        {/* 5. LIVE LOTTERY TICKET COUPON BANNER */}
        <div className="wingo-ticket p-3.5 text-white">
          <div className="grid grid-cols-2 divide-x divide-dashed divide-white/30 items-center">
            {/* Left Column: Period Badge + Interval + Previous 5 Balls */}
            <div className="pr-3 flex flex-col justify-between h-full">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 border border-white/30 text-[10px] font-bold text-white">
                  <HelpCircle className="w-3 h-3" /> How to play
                </span>
              </div>

              <div className="text-xs font-bold text-white/95 my-1.5">
                WinGo {activeInterval === 0.5 ? '30s' : `${activeInterval}Min`}
              </div>

              {/* 5 Previous Balls */}
              <div className="flex items-center gap-1.5 pt-0.5">
                {displayTopBalls.map((num, idx) => {
                  const isRedViolet = num === 0;
                  const isGreenViolet = num === 5;
                  const isGreen = [1, 3, 7, 9].includes(num);

                  let ballRingClass = 'lottery-ball-ring-red';
                  if (isRedViolet) ballRingClass = 'lottery-ball-ring-split-red-violet';
                  else if (isGreenViolet) ballRingClass = 'lottery-ball-ring-split-green-violet';
                  else if (isGreen) ballRingClass = 'lottery-ball-ring-green';

                  return (
                    <div
                      key={idx}
                      className={`w-6 h-6 rounded-full bg-white text-slate-800 font-extrabold text-xs flex items-center justify-center shadow-md ${ballRingClass}`}
                    >
                      {num}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Time remaining + Countdown cards + Period Serial */}
            <div className="pl-3 flex flex-col items-end justify-between h-full">
              <span className="text-xs font-bold text-white/90">ဝယ်ရန်ကျန်ချိန်</span>

              {/* Flip Countdown Box: 0 0 : 0 7 */}
              <div className="flex items-center gap-1 my-1">
                <div className="wingo-flip-card">{m1}</div>
                <div className="wingo-flip-card">{m2}</div>
                <span className="text-white font-black text-lg pb-1">:</span>
                <div className="wingo-flip-card">{s1}</div>
                <div className="wingo-flip-card">{s2}</div>
              </div>

              {/* Period Serial Number */}
              <div className="text-[11px] font-mono font-bold tracking-tight text-white/95">
                {periodId}
              </div>
            </div>
          </div>
        </div>

        {/* FEEDBACK BANNER (IF ANY) */}
        {feedback && (
          <div
            className={`p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 shadow-sm ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span className="font-medium">{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 6. MAIN BETTING PANEL (WHITE CARD) */}
        <div className="wingo-bet-card bg-white rounded-2xl p-4 space-y-4">

          {/* Top 3 Color Buttons */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* Green Button */}
            <button
              onClick={() => handleOpenBetDrawer('color', 'green', 'အစိမ်းရောင်', '#00b977')}
              disabled={!bettingOpen}
              className={`py-3 px-2 rounded-xl bg-[#00b977] hover:bg-[#05a56c] active:scale-[0.98] transition-all text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/25 cursor-pointer text-center ${
                !bettingOpen ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              အစိမ်းရောင်
            </button>

            {/* Purple Button */}
            <button
              onClick={() => handleOpenBetDrawer('color', 'violet', 'ခရမ်းရောင်', '#9b51e0')}
              disabled={!bettingOpen}
              className={`py-3 px-2 rounded-xl bg-[#9b51e0] hover:bg-[#883dd1] active:scale-[0.98] transition-all text-white font-extrabold text-xs sm:text-sm shadow-md shadow-purple-600/25 cursor-pointer text-center ${
                !bettingOpen ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              ခရမ်းရောင်
            </button>

            {/* Red Button */}
            <button
              onClick={() => handleOpenBetDrawer('color', 'red', 'အနီရောင်', '#ff4d4f')}
              disabled={!bettingOpen}
              className={`py-3 px-2 rounded-xl bg-[#ff4d4f] hover:bg-[#ee3638] active:scale-[0.98] transition-all text-white font-extrabold text-xs sm:text-sm shadow-md shadow-red-500/25 cursor-pointer text-center ${
                !bettingOpen ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              အနီရောင်
            </button>
          </div>

          {/* 10 3D Number Balls (0 to 9 in Single Horizontal Row) */}
          <div className="pt-1">
            <div className="grid grid-cols-5 gap-2 sm:gap-2.5 justify-items-center">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                const isRedViolet = num === 0;
                const isGreenViolet = num === 5;
                const isGreen = [1, 3, 7, 9].includes(num);

                let ringClass = 'lottery-ball-ring-red';
                let digitColor = 'text-[#ef4444]';
                let betColor = '#ff4d4f';

                if (isRedViolet) {
                  ringClass = 'lottery-ball-ring-split-red-violet';
                  digitColor = 'text-[#9b51e0]';
                  betColor = '#9b51e0';
                } else if (isGreenViolet) {
                  ringClass = 'lottery-ball-ring-split-green-violet';
                  digitColor = 'text-[#10b981]';
                  betColor = '#9b51e0';
                } else if (isGreen) {
                  ringClass = 'lottery-ball-ring-green';
                  digitColor = 'text-[#10b981]';
                  betColor = '#00b977';
                }

                return (
                  <button
                    key={num}
                    onClick={() => handleOpenBetDrawer('number', `n${num}`, `ဂဏန်း ${num}`, betColor)}
                    disabled={!bettingOpen}
                    className={`lottery-ball-3d w-full aspect-square max-w-[46px] ${ringClass} ${
                      !bettingOpen ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    <span className={`text-xs sm:text-sm font-black ${digitColor}`}>{num}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Multiplier Bar: ကျပ်း + X1, X5, X10, X20, X50, X100 */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5">
            <button
              type="button"
              onClick={() => {
                const number = Math.floor(Math.random() * 10);
                const color = [1, 3, 7, 9].includes(number) ? '#00b977' : number === 0 || number === 5 ? '#9b51e0' : '#ff4d4f';
                handleOpenBetDrawer('number', `n${number}`, `ဂဏန်း ${number}`, color);
              }}
              disabled={!bettingOpen}
              className="shrink-0 rounded-lg border border-blue-300 bg-blue-50/70 px-2.5 py-1 text-xs font-bold text-blue-600 disabled:opacity-50"
            >
              Random
            </button>
            {[1, 5, 10, 20, 50, 100].map((mul) => (
              <button
                key={mul}
                onClick={() => {
                  setMultiplier(mul);
                  playBeep(600, 0.04);
                }}
                className={`shrink-0 py-1 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  multiplier === mul
                    ? 'bg-[#00b977] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                X{mul}
              </button>
            ))}
          </div>

          {/* Big / Small Dual Bar: အကြီး (5-9) | အသေး (0-4) */}
          <div className="grid grid-cols-2 rounded-full overflow-hidden shadow-sm h-11">
            <button
              onClick={() => handleOpenBetDrawer('size', 'big', 'အကြီး (5–9)', '#f59e0b')}
              disabled={!bettingOpen}
              className={`bg-[#f59e0b] hover:bg-[#e08e04] active:opacity-90 transition-all text-white font-black text-sm flex items-center justify-center cursor-pointer ${
                !bettingOpen ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              အကြီး (Big 5-9)
            </button>
            <button
              onClick={() => handleOpenBetDrawer('size', 'small', 'အသေး (0–4)', '#60a5fa')}
              disabled={!bettingOpen}
              className={`bg-[#60a5fa] hover:bg-[#4b96f3] active:opacity-90 transition-all text-white font-black text-sm flex items-center justify-center cursor-pointer ${
                !bettingOpen ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              အသေး (Small 0-4)
            </button>
          </div>
        </div>

        {/* 7. BOTTOM HISTORY & RECORD TABS */}
        <div className="wingo-records pt-2 space-y-3">
          {/* Live Records Sync Header */}
          <div className="flex items-center justify-between px-2 pt-1">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-black text-emerald-800 tracking-wide uppercase">
                ● LIVE ဂိမ်းမှတ်တမ်း (အချိန်နှင့်တစ်ပြေးညီ မွမ်းမံမှု)
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-bold bg-white px-2 py-0.5 rounded-full border border-slate-200">
              လက်ရှိကာလ #{periodId.slice(-6)}
            </span>
          </div>

          {/* 3 Tabs Row: ဂိမ်းမှတ်တမ်း | ဇယား | ငါ့ဂိမ်းမှတ်တမ်း */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setRecordTab('records')}
              className={`wingo-record-tab py-2 px-2 rounded-xl text-center font-bold text-xs transition-all cursor-pointer ${
                recordTab === 'records'
                  ? 'bg-[#7a1f2b] text-white shadow-md shadow-rose-950/20'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
              }`}
            >
              ဂိမ်းမှတ်တမ်း
            </button>

            <button
              onClick={() => setRecordTab('chart')}
              className={`wingo-record-tab py-2 px-2 rounded-xl text-center font-bold text-xs transition-all cursor-pointer ${
                recordTab === 'chart'
                  ? 'bg-[#7a1f2b] text-white shadow-md shadow-rose-950/20'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
              }`}
            >
              ဇယား
            </button>

            <button
              onClick={() => setRecordTab('myBets')}
              className={`wingo-record-tab py-2 px-2 rounded-xl text-center font-bold text-xs transition-all cursor-pointer ${
                recordTab === 'myBets'
                  ? 'bg-[#7a1f2b] text-white shadow-md shadow-rose-950/20'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
              }`}
            >
              ငါ့လောင်းကြေးမှတ်တမ်း ({myBetsForInterval.length})
            </button>
          </div>

          {/* TAB 1: GAME RECORDS TABLE */}
          {recordTab === 'records' && (
            <div className="wingo-history-card bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
              {/* Blue Header Bar */}
              <div className="bg-[#7a1f2b] text-white text-xs font-bold py-2.5 px-3 grid grid-cols-4 text-center">
                <span className="text-left pl-2">ပွဲအမှတ်စဉ်</span>
                <span>နံပါတ်</span>
                <span>ကြီး/သေး</span>
                <span className="text-right pr-2">အရောင်</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-slate-100 text-xs">
                {paginatedHistory.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">မှတ်တမ်း မရှိသေးပါ။</div>
                ) : (
                  paginatedHistory.map((item, idx) => {
                    const isBig = item.result_number >= 5;
                    const isRedViolet = item.result_number === 0;
                    const isGreenViolet = item.result_number === 5;
                    const isGreen = [1, 3, 7, 9].includes(item.result_number);
                    const isJustSettled = item.period_id === recentSettledPeriodId;

                    let numColor = 'text-[#ef4444]';
                    if (isRedViolet) numColor = 'text-[#9b51e0]';
                    else if (isGreen || isGreenViolet) numColor = 'text-[#10b981]';

                    return (
                      <div
                        key={idx}
                        className={`grid grid-cols-4 items-center py-2.5 px-3 text-center transition-all ${
                          isJustSettled
                            ? 'bg-emerald-50 ring-2 ring-emerald-400/80 font-bold scale-[1.01]'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Period No */}
                        <span className="text-left pl-2 font-mono text-slate-600 text-[11px] font-medium flex items-center gap-1">
                          {item.period_id}
                          {isJustSettled && (
                            <span className="text-[8px] font-black bg-emerald-600 text-white px-1 py-0.2 rounded animate-pulse">
                              LIVE
                            </span>
                          )}
                        </span>

                        {/* Number */}
                        <span className={`font-black text-base ${numColor}`}>
                          {item.result_number}
                        </span>

                        {/* Big / Small */}
                        <span className="text-slate-600 font-medium">
                          {isBig ? 'အကြီး' : 'အသေး'}
                        </span>

                        {/* Color Dot */}
                        <div className="flex items-center justify-end pr-3 gap-1">
                          {isRedViolet ? (
                            <>
                              <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></span>
                              <span className="w-2.5 h-2.5 rounded-full bg-[#9b51e0]"></span>
                            </>
                          ) : isGreenViolet ? (
                            <>
                              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
                              <span className="w-2.5 h-2.5 rounded-full bg-[#9b51e0]"></span>
                            </>
                          ) : isGreen ? (
                            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1 rounded bg-white border border-slate-200 disabled:opacity-40 cursor-pointer"
                  >
                    « ရှေ့သို့
                  </button>
                  <span className="font-medium">
                    စာမျက်နှာ {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1 rounded bg-white border border-slate-200 disabled:opacity-40 cursor-pointer"
                  >
                    နောက်သို့ »
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CHART / TREND ANALYSIS */}
          {recordTab === 'chart' && (
            <div className="wingo-bet-card bg-white rounded-2xl p-4 space-y-4">
              <h3 className="font-extrabold text-xs text-slate-700">ဂဏန်းထွက်နှုန်း စာရင်းအင်း (Trend Analysis)</h3>
              <div className="grid grid-cols-10 gap-1 text-center">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                  const count = historyForInterval.filter((h) => h.result_number === num).length;
                  return (
                    <div key={num} className="flex flex-col items-center gap-1">
                      <div className="w-full bg-slate-100 rounded-t h-20 flex flex-col justify-end p-0.5">
                        <div
                          className="w-full bg-gradient-to-t from-red-500 to-amber-400 rounded-t"
                          style={{ height: `${Math.min(100, Math.max(15, count * 22))}%` }}
                        ></div>
                      </div>
                      <span className="font-bold text-xs text-slate-800">{num}</span>
                      <span className="text-[10px] text-slate-400">{count}x</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 text-center">
                * ပြီးခဲ့သော အကြိမ်ရေများတွင် ဂဏန်းတစ်ခုချင်းစီ၏ ထွက်ပေါ်ခဲ့မှု အကြိမ်ရေ အချိုး။
              </p>
            </div>
          )}

          {/* TAB 3: MY GAME HISTORY */}
          {recordTab === 'myBets' && (
            <div className="wingo-history-card bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
              <div className="bg-[#7a1f2b] text-white text-xs font-bold py-2.5 px-3 grid grid-cols-4 text-center">
                <span className="text-left pl-2">ကာလ</span>
                <span>ရွေးချယ်မှု</span>
                <span>လောင်းကြေး</span>
                <span className="text-right pr-2">ရလဒ်/ဆုငွေ</span>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {myBetsForInterval.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    ဤကာလအမျိုးအစားတွင် သင့်လောင်းကြေး မရှိသေးပါ။
                  </div>
                ) : (
                  myBetsForInterval.map((bet) => {
                    const isJustSettled = bet.period_id === recentSettledPeriodId;
                    return (
                      <div
                        key={bet.id}
                        className={`grid grid-cols-4 items-center py-2.5 px-3 text-center transition-all ${
                          isJustSettled
                            ? 'bg-emerald-50 ring-1 ring-emerald-400 font-bold'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-left pl-2 font-mono text-slate-500 text-[11px] flex items-center gap-1">
                          {bet.period_id.slice(-6)}
                          {isJustSettled && (
                            <span className="text-[8px] font-black bg-emerald-600 text-white px-1 rounded">
                              LIVE
                            </span>
                          )}
                        </span>
                        <span className="font-bold text-slate-700">
                          {bet.pick_type === 'number'
                            ? `နံပါတ် ${bet.pick_value.replace(/^n/, '')}`
                            : bet.pick_value === 'green'
                            ? 'အစိမ်း'
                            : bet.pick_value === 'red'
                            ? 'အနီ'
                            : bet.pick_value === 'violet'
                            ? 'ခရမ်း'
                            : bet.pick_value === 'big'
                            ? 'အကြီး'
                            : 'အသေး'}
                        </span>
                        <span className="font-mono text-slate-700 font-bold">
                          {bet.stake.toLocaleString()} K
                        </span>
                        <div className="text-right pr-2">
                          {bet.status === 'won' ? (
                            <span className="inline-flex items-center gap-1 font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[11px]">
                              🟢 +{bet.payout.toLocaleString()} K
                            </span>
                          ) : bet.status === 'lost' ? (
                            <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full text-[11px]">
                              🔴 အရှုံး
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-[11px] animate-pulse">
                              🟡 စောင့်ဆိုင်းဆဲ
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 8. INTERACTIVE SLIDE-UP BET DRAWER / MODAL */}
      {betDrawerOpen && selectedPick && (
        <div className="wingo-bet-overlay fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="wingo-bet-drawer w-full max-w-[480px] bg-white rounded-t-3xl p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span
                  className="px-3 py-1 rounded-full text-white text-xs font-black"
                  style={{ backgroundColor: selectedPick.color }}
                >
                  WinGo {activeInterval === 0.5 ? '30s' : `${activeInterval}Min`}
                </span>
                <span className="font-extrabold text-sm text-slate-800">
                  {selectedPick.label}
                </span>
              </div>
              <button
                onClick={() => setBetDrawerOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Base Unit Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">အခြေခံလောင်းကြေး ပမာဏ (MMK)</label>
              <div className="grid grid-cols-5 gap-1.5">
                {[100, 500, 1000, 2000, 5000].map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => {
                      setBaseUnit(unit);
                      playBeep(520, 0.03);
                    }}
                    className={`py-2 px-1 rounded-xl text-center text-xs font-black transition-all cursor-pointer ${
                      baseUnit === unit
                        ? 'bg-[#7a1f2b] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {unit.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Multiplier Pills */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">အဆပမာဏ (Multiplier)</label>
              <div className="grid grid-cols-6 gap-1.5">
                {[1, 5, 10, 20, 50, 100].map((mul) => (
                  <button
                    key={mul}
                    type="button"
                    onClick={() => {
                      setMultiplier(mul);
                      playBeep(600, 0.03);
                    }}
                    className={`py-1.5 rounded-lg text-center text-xs font-black transition-all cursor-pointer ${
                      multiplier === mul
                        ? 'bg-[#00b977] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    X{mul}
                  </button>
                ))}
              </div>
            </div>

            {/* Total Stake & Balance Summary */}
            <div className="bg-slate-50 p-3 rounded-2xl flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 block">စုစုပေါင်း လောင်းကြေး:</span>
                <strong className="text-base font-black text-blue-600 font-mono">
                  {totalStake.toLocaleString()} MMK
                </strong>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">သင့် MMK လက်ကျန်:</span>
                <strong className="text-sm font-black text-slate-800 font-mono">
                  {(currentUser?.wallet_balance ?? 0).toLocaleString()} MMK
                </strong>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setBetDrawerOpen(false)}
                className="py-3 px-4 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-sm transition-colors cursor-pointer"
              >
                မလုပ်တော့ပါ
              </button>

              {currentUser.wallet_balance < totalStake ? (
                <button
                  type="button"
                  onClick={() => {
                    setBetDrawerOpen(false);
                    if (onNavigate) onNavigate('wallet');
                  }}
                  className="py-3 px-4 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm shadow-md transition-colors cursor-pointer"
                >
                  ငွေသွင်းရန် →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmBet}
                  disabled={!bettingOpen}
                  className={`py-3 px-4 rounded-full bg-gradient-to-r from-[#7a1f2b] to-[#3474ed] hover:from-blue-600 hover:to-blue-700 text-white font-extrabold text-sm shadow-lg shadow-blue-500/25 transition-transform active:scale-[0.98] cursor-pointer ${
                    !bettingOpen ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {!bettingOpen ? 'လောင်းကြေးပိတ်ပါပြီ' : 'လောင်းကြေးအတည်ပြုရန်'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setSupportModalOpen(true)}
        aria-label="Customer Support"
        title="Customer Support"
        className="wingo-support-fab fixed bottom-5 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full text-white transition-transform hover:scale-105 active:scale-95"
      >
        <Headphones className="h-5 w-5" />
      </button>

      {/* CUSTOMER SUPPORT MODAL */}
      {supportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="wingo-support-modal w-full max-w-sm bg-white rounded-3xl p-5 space-y-4 shadow-2xl text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Headphones className="w-5 h-5 text-blue-500" />
                <h3 className="font-extrabold text-base">၂၄ နာရီ အကူအညီ ဝန်ဆောင်မှု</h3>
              </div>
              <button onClick={() => setSupportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <p>
                ငွေသွင်းငွေထုတ် နှင့် WinGo ကံစမ်းခြင်းဆိုင်ရာ မည်သည့်အခက်အခဲမဆို တိုက်ရိုက်ဆက်သွယ် မေးမြန်းနိုင်ပါသည်။
              </p>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 space-y-1 text-blue-800">
                <p>• <strong>Telegram Support:</strong> @azlottery_support</p>
                <p>• <strong>Viber Support:</strong> 09-987654321</p>
                <p>• <strong>အလုပ်ချိန်:</strong> ၂၄ နာရီ နေ့မနား ပိတ်ရက်မရှိ</p>
              </div>
            </div>
            <button
              onClick={() => setSupportModalOpen(false)}
              className="w-full py-2.5 rounded-full bg-[#7a1f2b] text-white font-extrabold text-sm"
            >
              နားလည်ပါပြီ
            </button>
          </div>
        </div>
      )}

      {/* 9. CELEBRATION WIN MODAL (အနိုင်ရလဒ်ကို သေချာ ပြသသော MODAL) */}
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
              <X className="w-5 h-5" />
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
                ကာလ #{celebrationWin.periodId.slice(-6)} တွင် ဆုကြေးငွေ ရရှိပါသည်
              </p>
            </div>

            {/* Huge Winning Amount Display */}
            <div className="rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-600 p-4 text-white shadow-md shadow-emerald-700/25">
              <span className="text-[11px] font-bold text-emerald-100 block">စုစုပေါင်း အနိုင်ဆုကြေးငွေ</span>
              <p className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-amber-200 drop-shadow-sm mt-0.5">
                +{celebrationWin.totalPayout.toLocaleString()} MMK
              </p>
            </div>

            {/* Result Ball Details */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2 text-left text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">ထွက်ရှိခဲ့သော ရလဒ်:</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full text-white font-black text-xs shadow-xs"
                    style={{
                      background:
                        celebrationWin.resultNumber === 0
                          ? 'linear-gradient(135deg, #ef4444 50%, #8b5cf6 50%)'
                          : celebrationWin.resultNumber === 5
                          ? 'linear-gradient(135deg, #10b981 50%, #8b5cf6 50%)'
                          : [1, 3, 7, 9].includes(celebrationWin.resultNumber)
                          ? '#10b981'
                          : '#ef4444',
                    }}
                  >
                    {celebrationWin.resultNumber}
                  </span>
                  <strong className="text-slate-900">
                    ဂဏန်း {celebrationWin.resultNumber} ({celebrationWin.resultNumber >= 5 ? 'အကြီး' : 'အသေး'})
                  </strong>
                </div>
              </div>

              {/* Winning Bets breakdown */}
              <div className="space-y-1">
                <span className="text-slate-500 font-medium block">သင်အနိုင်ရရှိသော အကွက်များ:</span>
                {celebrationWin.winningBets.map((wb, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between font-bold text-emerald-700 bg-emerald-50/90 px-2 py-1 rounded-lg"
                  >
                    <span>
                      {wb.pick_type === 'color'
                        ? `အရောင် (${wb.pick_value})`
                        : wb.pick_type === 'size'
                        ? `အရွယ် (${wb.pick_value.toUpperCase()})`
                        : `ဂဏန်း ${wb.pick_value}`}
                    </span>
                    <span>+{wb.payout.toLocaleString()} MMK</span>
                  </div>
                ))}
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
