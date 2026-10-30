'use client';

import React from 'react';
import { Activity, Gift, Home, UserRound, Wallet } from 'lucide-react';
import type { User } from '@/lib/store';

interface MobileNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: User;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
}) => {
  return (
    <nav className="mobile-nav" aria-label="Main menu" data-user-role={currentUser.role}>
      <button type="button" onClick={() => setCurrentTab('home')} className={`mobile-nav-item ${currentTab === 'home' ? 'active' : ''}`} aria-current={currentTab === 'home' ? 'page' : undefined}>
        <span className="mobile-nav-icon"><Home /></span><span>Home</span>
      </button>
      <button type="button" onClick={() => setCurrentTab('transactions')} className={`mobile-nav-item ${currentTab === 'transactions' ? 'active' : ''}`} aria-current={currentTab === 'transactions' ? 'page' : undefined}>
        <span className="mobile-nav-icon"><Activity /></span><span>Activity</span>
      </button>
      <button type="button" onClick={() => setCurrentTab('promotion')} className={`mobile-nav-item promotion-nav-item ${currentTab === 'promotion' ? 'active' : ''}`} aria-current={currentTab === 'promotion' ? 'page' : undefined}>
        <span className="mobile-nav-icon"><Gift /></span><span>Promotion</span>
      </button>
      <button type="button" onClick={() => setCurrentTab('wallet')} className={`mobile-nav-item ${currentTab === 'wallet' ? 'active' : ''}`} aria-current={currentTab === 'wallet' ? 'page' : undefined}>
        <span className="mobile-nav-icon"><Wallet /></span><span>Wallet</span>
      </button>
      <button type="button" onClick={() => setCurrentTab('account')} className={`mobile-nav-item ${currentTab === 'account' ? 'active' : ''}`} aria-current={currentTab === 'account' ? 'page' : undefined}>
        <span className="mobile-nav-icon"><UserRound /></span><span>Account</span>
      </button>
    </nav>
  );
};
