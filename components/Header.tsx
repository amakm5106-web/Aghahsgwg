'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gamepad2, Gift, History, Home, LogOut, ShieldCheck, Wallet, UserRound } from 'lucide-react';
import type { User } from '@/lib/store';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: User;
}

type AuthUser = { id: string };

export const Header: React.FC<HeaderProps> = ({ currentTab, setCurrentTab, currentUser }) => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/session', { cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() : { user: null })
      .then((data) => { if (active) setAuthUser(data.user ?? null); })
      .catch(() => { if (active) setAuthUser(null); })
      .finally(() => { if (active) setAuthLoaded(true); });
    return () => { active = false; };
  }, []);

  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (response.ok) {
        setAuthUser(null);
        window.location.assign('/login');
        return;
      }
    } catch {
      // Keep the current account state visible when the server could not revoke its session.
    }
    setLoggingOut(false);
  };

  return (
    <header className="topbar">
      <div className="wrap bar-inner">
        <button
          onClick={() => setCurrentTab('home')}
          className="brand hover:opacity-95 transition-opacity flex items-center gap-2 cursor-pointer border-0 bg-transparent text-left py-1"
          aria-label="AzLottery ပင်မစာမျက်နှာ"
        >
          <span className="brand-mark">A</span>
          <span className="brand-wordmark">AzLottery</span>
        </button>

        <nav className="nav">
          <button onClick={() => setCurrentTab('home')} className={currentTab === 'home' ? 'active' : ''}><Home className="nav-icon" /> ပင်မ</button>
          <button onClick={() => setCurrentTab('games')} className={currentTab === 'games' ? 'active' : ''}><Gamepad2 className="nav-icon" /> ဂိမ်းဧည့်ခန်း</button>
          <button onClick={() => setCurrentTab('wingo')} className={currentTab === 'wingo' ? 'active' : ''}><Gift className="nav-icon" /> WinGo ထီ</button>
          <button onClick={() => setCurrentTab('wheel')} className={currentTab === 'wheel' ? 'active' : ''}><span className="nav-dot-icon">◎</span> ကံစမ်းဘီး</button>
          <button onClick={() => setCurrentTab('wallet')} className={currentTab === 'wallet' ? 'active' : ''}><Wallet className="nav-icon" /> ပိုက်ဆံအိတ်</button>
          <button onClick={() => setCurrentTab('transactions')} className={currentTab === 'transactions' ? 'active' : ''}><History className="nav-icon" /> မှတ်တမ်း</button>
          <button onClick={() => setCurrentTab('account')} className={currentTab === 'account' ? 'active' : ''}><UserRound className="nav-icon" /> Account</button>
        </nav>

        <div className="userbar">
          <div
            onClick={() => setCurrentTab('wallet')}
            className={`balance-pill cursor-pointer transition-colors flex items-center gap-1.5 ${(currentUser?.wallet_balance ?? 0) === 0 ? 'border-amber-500/50 text-amber-300 hover:border-emerald-400' : 'hover:border-emerald-400'}`}
            title="ပိုက်ဆံအိတ်သို့ သွားရန်"
          >
            <Wallet className={`w-3.5 h-3.5 ${(currentUser?.wallet_balance ?? 0) === 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
            <span>{(currentUser?.wallet_balance ?? 0).toLocaleString()} MMK</span>
          </div>

          {authLoaded && authUser ? (
            <div className="auth-user-status">
              <button className="auth-logout-button icon-only" type="button" onClick={logout} disabled={loggingOut} aria-label="အကောင့်မှ ထွက်ရန်" title={loggingOut ? 'ထွက်နေသည်…' : 'အကောင့်မှ ထွက်ရန်'}>
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : authLoaded ? (
            <>
              <Link href="/login" className="button small secondary auth-login-link"><UserRound className="w-3.5 h-3.5" /><span>အကောင့်ဝင်ရန်</span></Link>
              <Link href="/signup" className="button small auth-signup-link"><span>စာရင်းသွင်းရန်</span></Link>
            </>
          ) : (
            <span className="auth-session-loading" aria-label="အကောင့်အခြေအနေ စစ်ဆေးနေသည်" />
          )}
        </div>
      </div>
    </header>
  );
};
