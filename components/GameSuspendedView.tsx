'use client';

import React from 'react';
import { ArrowLeft, ShieldAlert, WalletCards } from 'lucide-react';
import type { User } from '@/lib/store';

export function GameSuspendedView({ gameName, currentUser, onNavigateAction }: { gameName: string; currentUser: User; onNavigateAction: (tab: string, landing?: 'deposit' | 'withdraw') => void }) {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center justify-center px-4 py-10">
      <section className="w-full rounded-3xl border border-amber-200 bg-white p-6 text-center shadow-xl shadow-amber-950/5 sm:p-9">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"><ShieldAlert className="h-7 w-7" /></div>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-[#7A1F2B]">{gameName}</p>
        <h1 className="mt-2 text-2xl font-black text-stone-900 sm:text-3xl">ငွေပါသောကစားမှုကို ယာယီရပ်နားထားသည်</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-stone-600">လက်ရှိတွင် တရားဝင်အတည်ပြုထားသော ရလဒ်ရင်းမြစ်နှင့် server-side settlement မချိတ်ဆက်ရသေးပါ။ ထို့ကြောင့် demo/random ရလဒ်ဖြင့် MMK ဖြတ်တောက်ခြင်း သို့မဟုတ် ဆုငွေထည့်ခြင်း မလုပ်ပါ။</p>
        <div className="mt-5 rounded-2xl border border-stone-200 bg-[#fbf7ef] p-4 text-left">
          <p className="text-sm font-black text-stone-800">သင့် wallet လုံခြုံရေး</p>
          <p className="mt-1 text-xs leading-6 text-stone-600">ဒီစာမျက်နှာတွင် bet တင်၍မရသလို ငွေလက်ကျန်လည်း ပြောင်းလဲမည်မဟုတ်ပါ။ ငွေသွင်း/ငွေထုတ်တောင်းဆိုမှုများကို Wallet မှ စီမံနိုင်ပါသည်။</p>
          <p className="mt-2 text-xs font-bold text-[#7A1F2B]">လက်ရှိရနိုင်သော wallet: {Number(currentUser.wallet_balance || 0).toLocaleString()} MMK</p>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => onNavigateAction('home')} className="inline-flex items-center gap-2 rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-bold text-stone-700 hover:bg-stone-50"><ArrowLeft className="h-4 w-4" /> ပင်မသို့</button>
          <button type="button" onClick={() => onNavigateAction('wallet', 'deposit')} className="inline-flex items-center gap-2 rounded-xl bg-[#7A1F2B] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#651822]"><WalletCards className="h-4 w-4" /> Wallet သို့</button>
        </div>
      </section>
    </main>
  );
}
