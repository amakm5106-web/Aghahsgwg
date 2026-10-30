'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ArrowRight, Trophy, Sparkles, Disc, Wallet, ShieldCheck, Flame } from 'lucide-react';
import type { User } from '@/lib/store';

interface GamesViewProps {
  currentUser: User;
  onNavigate: (tab: string) => void;
}

export const GamesView: React.FC<GamesViewProps> = ({ currentUser, onNavigate }) => {
  const [filter, setFilter] = useState<'all' | 'lottery' | 'instant'>('all');

  const games = [
    {
      id: 'wingo',
      name: 'WinGo တိုက်ရိုက်ထီ',
      category: 'lottery',
      tag: 'တရားဝင် ထီဂိမ်း',
      intervals: '30s · 1m · 3m · 5m',
      desc: 'အရောင် (အစိမ်း၊ အနီ၊ ခရမ်း)၊ ဂဏန်း (၀ မှ ၉) နှင့် အကြီး/အသေးတို့ကို MMK ဖြင့် တိုက်ရိုက်ခန့်မှန်းပြီး ၉ ဆအထိ အနိုင်ငွေရယူပါ။',
      icon: '/cklottery/png/lottery-Dbl-eMPh.png',
      badge: '9X Payout',
      badgeColor: 'bg-red-50 text-red-600 border-red-200',
      action: () => onNavigate('wingo'),
      btnText: 'ယခုကစားရန်',
      primary: true,
    },
    {
      id: 'k3',
      name: 'K3 သုံးအန်စာတုံးထီ',
      category: 'lottery',
      tag: 'တရားဝင် ထီဂိမ်း',
      intervals: '1m · 3m · 5m · 10m',
      desc: 'အန်စာတုံး ၃ လုံး ပေါင်းလဒ်ရလဒ်ကို Big, Small, Odd, Even ဖြင့် တိုက်ရိုက်ခန့်မှန်းပြီး ၂ ဆ ဆုကြေး ရယူပါ။',
      icon: '/cklottery/lotterycategory/k3.png',
      badge: '2X Payout',
      badgeColor: 'bg-orange-50 text-orange-600 border-orange-200',
      action: () => onNavigate('k3'),
      btnText: 'K3 ကစားမည်',
      primary: false,
    },
    {
      id: '5d',
      name: '5D ဂဏန်းငါးလုံးထီ',
      category: 'lottery',
      tag: 'တရားဝင် ထီဂိမ်း',
      intervals: '1m · 3m · 5m · 10m',
      desc: 'ဂဏန်း ၅ လုံး ကံစမ်းထီရလဒ်အတွက် Big, Small, Odd, Even ရွေးချယ်မှုဖြင့် ၂ ဆ ဆုကြေး တိုက်ရိုက်ရယူပါ။',
      icon: '/cklottery/lotterycategory/5d.png',
      badge: '2X Payout',
      badgeColor: 'bg-violet-50 text-violet-600 border-violet-200',
      action: () => onNavigate('5d'),
      btnText: '5D ကစားမည်',
      primary: false,
    },
    {
      id: 'trx',
      name: 'TRX Win ဘလော့ချိန်းထီ',
      category: 'lottery',
      tag: 'တရားဝင် ထီဂိမ်း',
      intervals: '1m · 3m · 5m · 10m',
      desc: 'TRX Block Hash ရလဒ်အခြေခံ Color & Size မှန်းဆချက်ဖြင့် ၂ ဆ ဆုကြေး တိုက်ရိုက်ရယူပါ။',
      icon: '/cklottery/lotterycategory/trx-win.png',
      badge: '2X Payout',
      badgeColor: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      action: () => onNavigate('trx'),
      btnText: 'TRX ကစားမည်',
      primary: false,
    },
    {
      id: 'wheel',
      name: 'ကံစမ်းဘီးလှည့် (Lucky Wheel)',
      category: 'instant',
      tag: 'အမြန်ဆုကြေးဂိမ်း',
      intervals: '0x မှ 10x အထိ',
      desc: 'ဆာဗာမှ မျှတစွာရလဒ်သတ်မှတ်ပေးသော ကံစမ်းဘီးတွင် ၁၀၀ မှ ၅,၀၀၀ MMK အထိ လောင်းကြေးဖြင့် လှည့်လည်ကစားနိုင်ကာ ၁၀ ဆအထိ ဆုကြေးရယူနိုင်သည်။',
      icon: '/cklottery/png/wheel-BZjhzuBN.png',
      badge: '10X Instant',
      badgeColor: 'bg-amber-50 text-amber-600 border-amber-200',
      action: () => onNavigate('wheel'),
      btnText: 'ဘီးလှည့်ရန်',
      primary: false,
    },
    {
      id: 'wallet',
      name: 'ပိုက်ဆံအိတ်နှင့် ငွေထုတ်/ငွေသွင်း',
      category: 'instant',
      tag: 'ဘဏ္ဍာရေး စနစ်',
      intervals: 'Wave · KPay · AYA',
      desc: 'ဂိမ်းအားလုံး၏ တူညီသော လက်ကျန်ငွေကို စစ်ဆေးခြင်း၊ WavePay, KBZPay ထဲသို့ Auto ငွေသွင်း/ငွေထုတ် ဆောင်ရွက်ပါ။',
      icon: '/cklottery/png/wallet1-CWTYFnS2.png',
      badge: 'Auto Cashout',
      badgeColor: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      action: () => onNavigate('wallet'),
      btnText: 'ပိုက်ဆံအိတ်ဖွင့်ရန်',
      primary: false,
    },
  ];

  const filteredGames = games.filter((g) => {
    if (filter === 'lottery') return g.category === 'lottery';
    if (filter === 'instant') return g.category === 'instant';
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <span className="text-xs font-bold text-[#7a1f2b] uppercase tracking-wider block mb-1">
            AzLottery · ဂိမ်းဧည့်ခန်း
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1e2637]">ဂိမ်းများ ရွေးချယ်ကစားပါ</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ဂိမ်းအားလုံးသည် တရားဝင် MMK ဖြင့် တိုက်ရိုက်ကစားနိုင်ပြီး အနိုင်ငွေများကို ချက်ချင်း အကောင့်ထဲ ရရှိပါမည်။
          </p>
        </div>
        <div className="balance-pill bg-[#7a1f2b] text-white border-0 py-1.5 px-4 text-xs sm:text-sm shrink-0">
          လက်ကျန်: K{(currentUser?.wallet_balance ?? 0).toLocaleString()}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'အားလုံး (All)' },
          { id: 'lottery', label: 'ထီဂိမ်းများ (Lottery)' },
          { id: 'instant', label: 'အမြန်ဂိမ်း & ပိုက်ဆံအိတ်' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
              filter === tab.id
                ? 'bg-[#7a1f2b] text-white shadow-sm shadow-blue-500/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGames.map((game) => (
          <article
            key={game.id}
            className={`card bg-white p-5 rounded-2xl border transition-all flex flex-col justify-between ${
              game.primary
                ? 'border-blue-300 shadow-md shadow-blue-500/10 ring-2 ring-blue-500/10'
                : 'border-slate-100 shadow-xs hover:border-blue-200'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="relative w-12 h-12 rounded-xl bg-blue-50/70 p-2 flex items-center justify-center border border-blue-100">
                  <Image
                    src={game.icon}
                    alt={game.name}
                    width={40}
                    height={40}
                    className="object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${game.badgeColor}`}>
                  {game.badge}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-extrabold text-[#7a1f2b] bg-blue-50 px-2 py-0.5 rounded-full">
                  {game.tag}
                </span>
                <span className="text-xs text-slate-400 font-medium">{game.intervals}</span>
              </div>

              <h3 className="text-lg font-black text-[#1e2637] mb-1.5">{game.name}</h3>
              <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{game.desc}</p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-4">
              <span className="text-[11px] font-bold text-slate-400">တိုက်ရိုက် MMK</span>
              <button
                onClick={game.action}
                className={`py-2 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1 cursor-pointer ${
                  game.primary
                    ? 'bg-gradient-to-r from-[#7a1f2b] to-[#59adff] text-white shadow-sm shadow-blue-500/25 hover:brightness-105'
                    : 'bg-blue-50 text-[#7a1f2b] hover:bg-blue-100'
                }`}
              >
                <span>{game.btnText}</span>
                <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
