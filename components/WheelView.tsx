'use client';

import React, { useState } from 'react';
import type { User, WheelRound } from '@/lib/store';
import { Disc, Sparkles, Trophy, AlertCircle, History, RotateCw } from 'lucide-react';

interface WheelViewProps {
  currentUser: User;
  wheelHistory: WheelRound[];
  onSpin: (stakeMMK: number) => { multiplier: number; payout: number; finalBalance: number };
  onNavigate?: (tab: string) => void;
}

export const WheelView: React.FC<WheelViewProps> = ({
  currentUser,
  wheelHistory,
  onSpin,
  onNavigate,
}) => {
  const [stake, setStake] = useState<number>(500);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);
  const [lastResult, setLastResult] = useState<{ multiplier: number; payout: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSpin = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSpinning) return;
    setError(null);

    if (currentUser.wallet_balance < stake) {
      setError('လှည့်ရန် MMK လက်ကျန်ငွေ မလုံလောက်ပါ။');
      return;
    }

    try {
      setIsSpinning(true);
      const res = onSpin(stake);

      // Segment mapping for 8 slices (45 deg each)
      // Multipliers: [0, 1, 2, 0, 3, 5, 0, 10]
      const extraSpins = 360 * 5; // 5 full turns
      const randomOffset = Math.floor(Math.random() * 30) - 15;
      const targetDeg = rotationDegrees + extraSpins + 360 + randomOffset;
      setRotationDegrees(targetDeg);

      setTimeout(() => {
        setIsSpinning(false);
        setLastResult({ multiplier: res.multiplier, payout: res.payout });
      }, 2800);
    } catch (err: any) {
      setIsSpinning(false);
      setError(err.message || 'ကံစမ်းဘီးလှည့်မှု မအောင်မြင်ပါ။');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="section-head">
        <div>
          <span className="eyebrow text-blue-600 font-bold">ဆာဗာမှ မျှတစွာသတ်မှတ်ပေးသောဂိမ်း</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1e2637]">ကံစမ်းဘီးလှည့် (Lucky Wheel)</h1>
          <p className="text-sm text-slate-500">
            ၁၀၀ မှ ၅,၀၀၀ MMK အထိ လောင်းကြေးသတ်မှတ်ပြီး ဘီးလှည့်ကာ ၁၀ ဆအထိ အနိုင်ငွေ ရယူပါ။
          </p>
        </div>
        <div className="balance-pill text-sm py-1.5 px-4 bg-[#7a1f2b] text-white border-0 shadow-xs">
          MMK လက်ကျန်: {currentUser.wallet_balance.toLocaleString()} MMK
        </div>
      </div>

      <div className="split">
        {/* Wheel & Play section */}
        <section className="panel wheel-card border-emerald-500/30">
          <div className="relative flex justify-center py-4">
            {/* Pointer Pin at top */}
            <div className="absolute top-1 z-20 w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-amber-400 filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]"></div>

            <div
              className="relative w-[280px] h-[280px] rounded-full border-4 border-emerald-500/40 shadow-[0_0_30px_rgba(32,207,131,0.25)] flex items-center justify-center overflow-hidden transition-transform duration-[2800ms] ease-[cubic-bezier(0.12,0.8,0.2,1)]"
              style={{
                transform: `rotate(${rotationDegrees}deg)`,
              }}
            >
              {/* SVG 8 sectors wheel */}
              <svg viewBox="0 0 280 280" className="w-full h-full">
                <defs>
                  <linearGradient id="grad-gold" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#f7d070" />
                    <stop offset="100%" stopColor="#d89b2b" />
                  </linearGradient>
                  <linearGradient id="grad-green" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#0f766e" />
                  </linearGradient>
                  <linearGradient id="grad-dark" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#12251a" />
                    <stop offset="100%" stopColor="#08140d" />
                  </linearGradient>
                </defs>

                {/* 8 slices of 45 deg */}
                {[
                  { deg: 0, mult: '10×', color: 'url(#grad-gold)', textColor: '#04140c' },
                  { deg: 45, mult: '0×', color: 'url(#grad-dark)', textColor: '#64748b' },
                  { deg: 90, mult: '5×', color: 'url(#grad-green)', textColor: '#ffffff' },
                  { deg: 135, mult: '1×', color: 'url(#grad-dark)', textColor: '#a7f3d0' },
                  { deg: 180, mult: '2×', color: '#10b981', textColor: '#ffffff' },
                  { deg: 225, mult: '0×', color: 'url(#grad-dark)', textColor: '#64748b' },
                  { deg: 270, mult: '3×', color: '#8b5cf6', textColor: '#ffffff' },
                  { deg: 315, mult: '0×', color: 'url(#grad-dark)', textColor: '#64748b' },
                ].map((s, i) => {
                  const angle1 = (s.deg - 22.5) * (Math.PI / 180);
                  const angle2 = (s.deg + 22.5) * (Math.PI / 180);
                  const r = 140;
                  const x1 = 140 + r * Math.sin(angle1);
                  const y1 = 140 - r * Math.cos(angle1);
                  const x2 = 140 + r * Math.sin(angle2);
                  const y2 = 140 - r * Math.cos(angle2);
                  const path = `M 140 140 L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;

                  // Text position
                  const textAngle = s.deg * (Math.PI / 180);
                  const textR = 100;
                  const tx = 140 + textR * Math.sin(textAngle);
                  const ty = 140 - textR * Math.cos(textAngle);

                  return (
                    <g key={i}>
                      <path d={path} fill={s.color} stroke="#07110d" strokeWidth="2" />
                      <text
                        x={tx}
                        y={ty}
                        fill={s.textColor}
                        fontSize="14"
                        fontWeight="900"
                        fontFamily="monospace"
                        textAnchor="middle"
                        dominantBaseline="central"
                        transform={`rotate(${s.deg}, ${tx}, ${ty})`}
                      >
                        {s.mult}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Center Hub */}
              <div className="absolute z-10 w-20 h-20 rounded-full border-4 border-[#07110d] bg-[#0c2417] text-emerald-400 flex flex-col items-center justify-center font-black text-xs shadow-xl pointer-events-none">
                {isSpinning ? (
                  <RotateCw className="w-5 h-5 animate-spin text-emerald-400" />
                ) : (
                  <>
                    <span className="text-amber-400 text-sm">◎</span>
                    <span className="text-[11px] font-bold text-white">SPIN</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Result Banner */}
          <div className="min-h-12 flex items-center justify-center my-3 text-center">
            {lastResult ? (
              <div
                className={`p-3 rounded-xl border text-sm font-bold flex items-center gap-2 ${
                  lastResult.multiplier > 0
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}
              >
                {lastResult.multiplier > 0 ? (
                  <>
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <span>
                      ကံစမ်းဘီးရလဒ်: {lastResult.multiplier}× — အနိုင်ငွေ {lastResult.payout.toLocaleString()} MMK ရရှိပါသည်!
                    </span>
                  </>
                ) : (
                  <span>ကံစမ်းဘီးရလဒ်: 0× — နောက်တစ်ကြိမ် ထပ်မံကံစမ်းပါ။</span>
                )}
              </div>
            ) : (
              <p className="text-slate-400 text-sm">လှည့်ရန် လောင်းကြေး MMK ရွေးချယ်ပြီး ခလုတ်ကို နှိပ်ပါ။</p>
            )}
          </div>

          {/* Stake & Spin Form */}
          <form onSubmit={handleSpin} className="form w-full max-w-sm">
            <div className="field">
              <label htmlFor="wheel-stake">လောင်းကြေးပမာဏ (MMK)</label>
              <input
                id="wheel-stake"
                type="number"
                min="100"
                max="5000"
                step="100"
                value={stake}
                onChange={(e) => setStake(Math.max(100, Math.min(5000, Number(e.target.value))))}
                disabled={isSpinning}
                required
              />
            </div>

            {/* Quick Stake Buttons */}
            <div className="flex flex-wrap gap-2 justify-center">
              {[100, 500, 1000, 2000, 5000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  disabled={isSpinning}
                  onClick={() => setStake(amt)}
                  className={`button small ${stake === amt ? '' : 'secondary text-xs py-1'}`}
                >
                  {amt.toLocaleString()} MMK
                </button>
              ))}
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {currentUser.wallet_balance === 0 ? (
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('wallet')}
                className="button w-full py-3 text-base font-extrabold bg-amber-500 hover:bg-amber-400 text-black"
              >
                လက်ကျန်ငွေ 0 MMK (ဆက်ကစားရန် ငွေသွင်းပါ) →
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSpinning || currentUser.wallet_balance < stake}
                className={`button w-full py-3 text-base font-extrabold ${isSpinning || currentUser.wallet_balance < stake ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSpinning
                  ? 'ဘီးလည်နေပါသည်…'
                  : currentUser.wallet_balance < stake
                  ? `လက်ကျန်ငွေ မလုံလောက်ပါ (${currentUser.wallet_balance.toLocaleString()} MMK)`
                  : `${stake.toLocaleString()} MMK ဖြင့် ဘီးလှည့်ရန်`}
              </button>
            )}
          </form>

          <p className="notice-strip text-xs text-slate-300 mt-4 text-center">
            ဖြစ်နိုင်သော အမြှောက်ကိန်းများမှာ 0×, 1×, 2×, 3×, 5×, 10× ဖြစ်ပြီး အနိုင်ငွေ MMK ကို ချက်ချင်း ပိုက်ဆံအိတ်ထဲ ထည့်သွင်းပေးပါသည်။
          </p>
        </section>

        {/* History section */}
        <section className="panel space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-400" /> လတ်တလော အလှည့်မှတ်တမ်းများ
            </h2>
            <span className="text-xs text-slate-400">နောက်ဆုံး ၈ ကြိမ်</span>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>လောင်းကြေး</th>
                  <th>အမြှောက်ဆ</th>
                  <th>ရရှိသည့် MMK</th>
                  <th>အချိန်</th>
                </tr>
              </thead>
              <tbody>
                {wheelHistory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-slate-400">
                      သင့်ကံစမ်းဘီးရလဒ်များ ဤနေရာတွင် ပေါ်လာပါမည်။
                    </td>
                  </tr>
                ) : (
                  wheelHistory.slice(0, 8).map((round) => (
                    <tr key={round.id}>
                      <td className="font-mono">{round.stake.toLocaleString()} MMK</td>
                      <td className="font-bold text-amber-300">{round.multiplier}×</td>
                      <td className="font-mono font-bold text-emerald-400">
                        {round.payout > 0 ? `+${round.payout.toLocaleString()} MMK` : '0 MMK'}
                      </td>
                      <td className="text-slate-400 text-xs">{round.created_at}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
