'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Header } from '@/components/Header';
import { MobileNav } from '@/components/MobileNav';
import { HomeView } from '@/components/HomeView';
import { GamesView } from '@/components/GamesView';
import { WalletView } from '@/components/WalletView';
import { TransactionsView } from '@/components/TransactionsView';
import { AdminView } from '@/components/AdminView';
import { AccountView } from '@/components/AccountView';
import { PromotionView } from '@/components/PromotionView';
import { AdminAuthGate } from '@/components/AdminAuthGate';
import { LoginPromptModal } from '@/components/LoginPromptModal';
import { WinGoView } from '@/components/WinGoView';
import { LotteryVariantView } from '@/components/LotteryVariantView';
import { WheelView } from '@/components/WheelView';

export default function AzLotteryApp() {
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [walletLandingTab, setWalletLandingTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loginPromptReason, setLoginPromptReason] = useState<string>('');

  const {
    isLoaded,
    isUserLoggedIn,
    currentUser,
    transactions,
    requests,
    providers,
    adminData,
    adminLoading,
    adminError,
    wingoBets,
    wingoHistory,
    wheelHistory,
    refreshWalletData,
    refreshAdminData,
    submitDeposit,
    submitWithdrawal,
    reviewPaymentRequest,
    saveProvider,
    spinWheel,
    placeWinGoBet,
    settleWinGoRound,
    placeVariantBet,
    settleVariantWin,
  } = useAppStore();

  const handleNavigate = (tab: string, landing?: 'deposit' | 'withdraw') => {
    const protectedTabs = ['wingo', 'k3', '5d', 'trx', 'wheel', 'wallet', 'games'];
    if (!isUserLoggedIn && protectedTabs.includes(tab)) {
      setLoginPromptReason(
        tab === 'wallet'
          ? 'ငွေသွင်း/ငွေထုတ် ပြုလုပ်ရန် အကောင့်ဝင်ရောက်ရန် (သို့မဟုတ် စာရင်းသွင်းရန်) လိုအပ်ပါသည်'
          : 'ဂိမ်းများကြည့်ရန် အကောင့်ဝင်ရောက်ရန် (သို့မဟုတ် စာရင်းသွင်းရန်) လိုအပ်ပါသည်'
      );
      setShowLoginPrompt(true);
      return;
    }
    if (landing) setWalletLandingTab(landing);
    setCurrentTab(tab);
  };

  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab) {
        const protectedTabs = ['wingo', 'k3', '5d', 'trx', 'wheel', 'wallet'];
        if (protectedTabs.includes(tab) && !isUserLoggedIn) {
          setShowLoginPrompt(true);
          setCurrentTab('home');
        } else {
          setCurrentTab(tab);
        }
      } else if (window.location.hash === '#admin') {
        setCurrentTab('admin');
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isUserLoggedIn]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#fbf7ef] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#7a1f2b] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[#7a1f2b] font-bold text-sm">ဖွင့်လှစ်နေပါသည်…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf7ef] text-[#1e2637]">
      {currentTab !== 'wingo' && currentTab !== 'k3' && currentTab !== '5d' && currentTab !== 'trx' && currentTab !== 'account' && (
        <Header currentTab={currentTab} setCurrentTab={handleNavigate} currentUser={currentUser} />
      )}

      <main className={`flex-1 ${['wingo', 'k3', '5d', 'trx'].includes(currentTab) ? 'w-full px-0 sm:wrap py-0 sm:py-6' : currentTab === 'account' ? 'w-full px-0 py-0' : 'wrap py-8 sm:py-10'}`}>
        {currentTab === 'home' && <HomeView currentUser={currentUser} onNavigate={handleNavigate} />}
        {currentTab === 'games' && <GamesView currentUser={currentUser} onNavigate={handleNavigate} />}
        {currentTab === 'wingo' && (
          <WinGoView
            currentUser={currentUser}
            wingoBets={wingoBets}
            wingoHistory={wingoHistory}
            onPlaceBet={placeWinGoBet}
            onSettleRound={settleWinGoRound}
            onNavigate={handleNavigate}
          />
        )}
        {['k3', '5d', 'trx'].includes(currentTab) && (
          <LotteryVariantView
            variant={currentTab as 'k3' | '5d' | 'trx'}
            currentUser={currentUser}
            onPlaceBet={placeVariantBet}
            onSettleWin={settleVariantWin}
            onNavigate={handleNavigate}
          />
        )}
        {currentTab === 'wheel' && (
          <WheelView
            currentUser={currentUser}
            wheelHistory={wheelHistory}
            onSpin={spinWheel}
            onNavigate={handleNavigate}
          />
        )}
        {currentTab === 'account' && <AccountView currentUser={currentUser} onNavigateAction={handleNavigate} onWalletShortcutAction={(tab) => handleNavigate('wallet', tab)} />}
        {currentTab === 'promotion' && <PromotionView onNavigate={handleNavigate} currentUser={currentUser} />}
        {currentTab === 'wallet' && <WalletView currentUser={currentUser} initialTab={walletLandingTab} requests={requests} providers={providers} onCreateDeposit={submitDeposit} onCreateWithdrawal={submitWithdrawal} onRefresh={refreshWalletData} />}
        {currentTab === 'transactions' && <TransactionsView currentUser={currentUser} transactions={transactions} />}
        {currentTab === 'admin' && (
          <AdminAuthGate userRole={currentUser.role} onExit={() => setCurrentTab('home')}>
            <div className="mb-12 rounded-2xl border border-white/10 bg-[#070d19] p-4 text-white shadow-2xl sm:p-6 lg:p-8">
              <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
                <button type="button" onClick={() => setCurrentTab('home')} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-200 transition-colors hover:bg-white/15">← ပင်မစာမျက်နှာသို့</button>
                <span className="text-xs text-slate-400">Role: <b className="text-amber-400">{currentUser.role}</b></span>
              </div>
              <AdminView data={adminData} isLoading={adminLoading} error={adminError} onRefresh={refreshAdminData} onReview={reviewPaymentRequest} onSaveProvider={saveProvider} />
            </div>
          </AdminAuthGate>
        )}
      </main>

      {!['wingo', 'k3', '5d', 'trx', 'admin'].includes(currentTab) && <MobileNav currentTab={currentTab} setCurrentTab={handleNavigate} currentUser={currentUser} />}
      <LoginPromptModal isOpen={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} reason={loginPromptReason} />
    </div>
  );
}
