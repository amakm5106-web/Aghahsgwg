'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  ArrowDownCircle,
  ArrowLeft,
  ArrowUpCircle,
  Bell,
  BookOpen,
  ChevronRight,
  CircleHelp,
  Crown,
  Gamepad2,
  Gift,
  Globe2,
  Info,
  LogOut,
  Megaphone,
  MessageSquare,
  Receipt,
  Settings,
  ShieldCheck,
  Ticket,
  UserRound,
  Wallet,
  X,
} from 'lucide-react';
import type { User } from '@/lib/store';

type AuthUser = { id: string; identifier: string; identifierType: 'email' | 'phone'; role: 'user' | 'admin' };
type AccountDialog = { title: string; message: string } | null;

type AccountViewProps = {
  currentUser: User;
  onNavigateAction: (tab: string) => void;
  onWalletShortcutAction: (tab: 'deposit' | 'withdraw') => void;
};

const serviceItems: { label: string; Icon: LucideIcon }[] = [
  { label: 'Settings', Icon: Settings },
  { label: 'Feedback', Icon: MessageSquare },
  { label: 'Announcement', Icon: Megaphone },
  { label: '24/7 Customer service', Icon: CircleHelp },
  { label: "Beginner's Guide", Icon: BookOpen },
  { label: 'About us', Icon: Info },
];

const maskIdentifier = (identifier: string) => {
  if (identifier.includes('@')) {
    const [name, domain] = identifier.split('@');
    return `${name.slice(0, 1)}••••@${domain}`;
  }
  const digits = identifier.replace(/\D/g, '');
  return digits.length > 4 ? `••••••${digits.slice(-4)}` : '••••';
};

export const AccountView: React.FC<AccountViewProps> = ({ currentUser, onNavigateAction: onNavigate, onWalletShortcutAction: onWalletShortcut }) => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [dialog, setDialog] = useState<AccountDialog>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
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

  const balance = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(currentUser?.wallet_balance ?? 0);
  const memberLabel = authUser ? maskIdentifier(authUser.identifier) : authLoaded ? 'Guest account' : 'Loading account…';
  const memberId = authUser ? authUser.id.slice(-6).toUpperCase() : `#${currentUser.id}`;
  const openUnavailable = (title: string) => setDialog({
    title,
    message: 'This service is not connected in this build yet. Your account balance and payment settings have not been changed.',
  });

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error('Logout request failed');
      setAuthUser(null);
      window.location.assign('/login');
    } catch {
      setLoggingOut(false);
      setShowLogoutConfirm(false);
      setDialog({ title: 'Could not log out', message: 'Please try again. Your current session has not been changed.' });
    }
  };

  return (
    <div className="account-page">
      <div className="account-inner">
        <header className="account-hero">
          <button type="button" className="account-back" onClick={() => onNavigate('home')} aria-label="Back to home">
            <ArrowLeft /> <span>Home</span>
          </button>
          <div className="account-profile-row">
            <div className="account-avatar" aria-hidden="true"><UserRound className="w-7 h-7" /></div>
            <div className="account-profile-copy">
              <span className="account-profile-name">{memberLabel}</span>
              <span className="account-uid">UID <b>{memberId}</b></span>
              <span className="account-profile-caption">AzLottery account center</span>
            </div>
          </div>
        </header>

        <section className="account-balance-card" aria-label="Total balance and shortcuts">
          <div className="account-balance-heading">
            <div>
              <span className="account-muted-label">Total balance</span>
              <strong className="account-balance-value">K{balance}</strong>
            </div>
            <span className="account-currency">MMK</span>
          </div>
          <div className="account-shortcut-row">
            <button type="button" className="account-shortcut" onClick={() => onNavigate('wallet')}>
              <span className="account-shortcut-icon account-icon-wallet"><Wallet /></span><span>Wallet</span>
            </button>
            <button type="button" className="account-shortcut" onClick={() => onWalletShortcut('deposit')}>
              <span className="account-shortcut-icon account-icon-deposit"><ArrowDownCircle /></span><span>Deposit</span>
            </button>
            <button type="button" className="account-shortcut" onClick={() => onWalletShortcut('withdraw')}>
              <span className="account-shortcut-icon account-icon-withdraw"><ArrowUpCircle /></span><span>Withdraw</span>
            </button>
            <button type="button" className="account-shortcut" onClick={() => openUnavailable('VIP')}>
              <span className="account-shortcut-icon account-icon-vip"><Crown /></span><span>VIP</span>
            </button>
          </div>
        </section>

        <main className="account-content">
          <section className="account-feature-grid" aria-label="Account history shortcuts">
            {authLoaded && authUser?.role === 'admin' && (
              <button type="button" className="account-feature-tile account-admin-dashboard-tile" onClick={() => window.location.assign('/admin')}>
                <span className="account-feature-icon feature-blue"><ShieldCheck /></span>
                <span><b>Admin Dashboard</b><small>AzLottery control panel</small></span>
              </button>
            )}
            <button type="button" className="account-feature-tile" onClick={() => onNavigate('wingo')}>
              <span className="account-feature-icon feature-blue"><Gamepad2 /></span>
              <span><b>Game History</b><small>My game history</small></span>
            </button>
            <button type="button" className="account-feature-tile" onClick={() => onNavigate('transactions')}>
              <span className="account-feature-icon feature-green"><Receipt /></span>
              <span><b>Transaction</b><small>My transaction history</small></span>
            </button>
            <button type="button" className="account-feature-tile" onClick={() => onWalletShortcut('deposit')}>
              <span className="account-feature-icon feature-rose"><ArrowDownCircle /></span>
              <span><b>Deposit</b><small>My deposit history</small></span>
            </button>
            <button type="button" className="account-feature-tile" onClick={() => onWalletShortcut('withdraw')}>
              <span className="account-feature-icon feature-orange"><ArrowUpCircle /></span>
              <span><b>Withdraw</b><small>My withdrawal history</small></span>
            </button>
          </section>

          <section className="account-list-card" aria-label="Account menu">
            <button type="button" className="account-menu-row" onClick={() => openUnavailable('Notification')}>
              <span className="account-row-icon row-blue"><Bell /></span><span className="account-row-label">Notification</span><ChevronRight />
            </button>
            <button type="button" className="account-menu-row" onClick={() => openUnavailable('Gifts')}>
              <span className="account-row-icon row-blue"><Gift /></span><span className="account-row-label">Gifts</span><ChevronRight />
            </button>
            <button type="button" className="account-menu-row" onClick={() => openUnavailable('My Top-Up Coupons')}>
              <span className="account-row-icon row-blue"><Ticket /></span><span className="account-row-label">My Top-Up Coupons</span><ChevronRight />
            </button>
            <button type="button" className="account-menu-row" onClick={() => openUnavailable('Game statistics')}>
              <span className="account-row-icon row-blue"><Activity /></span><span className="account-row-label">Game statistics</span><ChevronRight />
            </button>
            <button type="button" className="account-menu-row" onClick={() => openUnavailable('Language')}>
              <span className="account-row-icon row-blue"><Globe2 /></span><span className="account-row-label">Language</span><span className="account-row-value">English</span><ChevronRight />
            </button>
          </section>

          <section className="account-service-card" aria-label="Service center">
            <h2>Service center</h2>
            <div className="account-service-grid">
              {serviceItems.map(({ label, Icon }) => (
                <button type="button" className="account-service-item" key={label} onClick={() => openUnavailable(label)}>
                  <span className="account-service-icon"><Icon /></span><span>{label}</span>
                </button>
              ))}
            </div>
          </section>

          {authLoaded && authUser ? (
            <button type="button" className="account-logout-button" onClick={() => setShowLogoutConfirm(true)}>
              <LogOut /> Log out
            </button>
          ) : authLoaded ? (
            <div className="account-auth-actions">
              <Link href="/login" className="account-auth-link">Log in</Link>
              <Link href="/signup" className="account-auth-link account-auth-primary">Register</Link>
            </div>
          ) : (
            <p className="account-footer-note">Checking account session…</p>
          )}
          <p className="account-footer-note">Account and wallet information shown from this app.</p>
        </main>
      </div>

      {(dialog || showLogoutConfirm) && (
        <div className="account-modal-backdrop" onClick={() => { setDialog(null); setShowLogoutConfirm(false); }}>
          <section className="account-modal" role="dialog" aria-modal="true" aria-labelledby="account-modal-title" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="account-modal-close" aria-label="Close" onClick={() => { setDialog(null); setShowLogoutConfirm(false); }}><X /></button>
            <span className="account-modal-mark">{showLogoutConfirm ? <LogOut /> : <CircleHelp />}</span>
            <h2 id="account-modal-title">{showLogoutConfirm ? 'Do you want to log out?' : dialog?.title}</h2>
            <p>{showLogoutConfirm ? 'Your current session will end. You can sign in again at any time.' : dialog?.message}</p>
            <div className="account-modal-actions">
              {showLogoutConfirm ? (
                <>
                  <button type="button" className="account-modal-secondary" onClick={() => setShowLogoutConfirm(false)} disabled={loggingOut}>Cancel</button>
                  <button type="button" className="account-modal-primary" onClick={handleLogout} disabled={loggingOut}>{loggingOut ? 'Logging out…' : 'Confirm'}</button>
                </>
              ) : (
                <button type="button" className="account-modal-primary" onClick={() => setDialog(null)}>OK</button>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
