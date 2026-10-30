'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { getWinGoColors, checkWinGoMatch, calculateWinGoPayout } from '@/lib/rules';
import { determineWinGoAutoWin } from '@/lib/autowin';

export interface User {
  id: number;
  login_identifier: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  wallet_balance: number;
  reserved_balance: number;
  created_at: string;
}

export interface WalletTransaction {
  id: string;
  user_id: number;
  kind: string;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
  user_identifier?: string;
  reference_key?: string;
}

export interface PaymentRequest {
  id: string | number;
  user_id: string | number;
  user_identifier: string;
  phone?: string;
  kind: 'deposit' | 'withdrawal';
  amount: number | null;
  payment_method: string;
  account_number: string;
  account_name: string;
  txn_id?: string;
  transfer_id?: string;
  payout_reference?: string;
  provider_code?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  admin_note?: string;
}

export interface ProviderConnection {
  code: 'wave' | 'kbz' | 'aya' | 'cb';
  name: string;
  receiver_phone: string;
  receiver_name: string;
  status: 'active' | 'disabled';
}

export interface AdminFinanceUser {
  id: string;
  identifier: string;
  identifier_type: 'email' | 'phone';
  status: 'active' | 'suspended';
  created_at: string;
  balance: number;
  reserved: number;
  available: number;
}

export interface AdminFinanceStats {
  totalUsers: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  approvedDeposits: number;
  approvedWithdrawals: number;
  walletTotal: number;
  walletReserved: number;
  walletAvailable: number;
}

export interface AdminFinanceData {
  stats: AdminFinanceStats;
  requests: PaymentRequest[];
  users: AdminFinanceUser[];
  transactions: WalletTransaction[];
  providers: ProviderConnection[];
}

export interface AdminReviewPayload {
  decision: 'approve' | 'reject';
  amountMmk?: number;
  providerCode?: ProviderConnection['code'];
  payoutReference?: string;
  note?: string;
}

export interface WinGoBet {
  id: string;
  user_id: number;
  period_id: string;
  interval: number;
  pick_type: 'color' | 'size' | 'number';
  pick_value: string;
  stake: number;
  payout: number;
  result_number: number | null;
  status: 'pending' | 'won' | 'lost';
  created_at: string;
}

export interface WinGoRoundResult {
  period_id: string;
  interval: number;
  result_number: number;
  colors: ('green' | 'red' | 'violet')[];
  ended_at: string;
}

export interface WheelRound {
  id: string;
  user_id: number;
  stake: number;
  multiplier: number;
  payout: number;
  created_at: string;
}

const EMPTY_USER: User = {
  id: 0,
  login_identifier: '',
  role: 'user',
  status: 'active',
  wallet_balance: 0,
  reserved_balance: 0,
  created_at: '',
};
const EMPTY_ADMIN_DATA: AdminFinanceData = {
  stats: {
    totalUsers: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    approvedDeposits: 0,
    approvedWithdrawals: 0,
    walletTotal: 0,
    walletReserved: 0,
    walletAvailable: 0,
  },
  requests: [],
  users: [],
  transactions: [],
  providers: [],
};
const GAME_PLAY_PAUSED = 'ငွေပါသောဂိမ်းလောင်းကြေးကို အတည်ပြုထားသော result/settlement စနစ် မပြီးမချင်း ယာယီရပ်နားထားပါသည်။';

async function responseData(response: Response): Promise<Record<string, unknown>> {
  const data: unknown = await response.json().catch(() => ({}));
  const record = data && typeof data === 'object' && !Array.isArray(data) ? data as Record<string, unknown> : {};
  if (!response.ok) throw new Error(typeof record.error === 'string' ? record.error : 'Server တောင်းဆိုမှု မအောင်မြင်ပါ။');
  return record;
}

function mapRequest(item: Record<string, unknown>): PaymentRequest {
  const amount = item.amount === null || item.amount === undefined ? null : Number(item.amount);
  return {
    id: String(item.id || ''),
    user_id: String(item.user_id || ''),
    user_identifier: String(item.user_identifier || ''),
    kind: item.kind === 'withdrawal' ? 'withdrawal' : 'deposit',
    amount: amount !== null && Number.isSafeInteger(amount) ? amount : null,
    payment_method: String(item.payment_method || (item.provider_code ? String(item.provider_code).toUpperCase() : 'စီမံခန့်ခွဲသူ စစ်ဆေးမည်')),
    account_number: String(item.phone || item.account_number || ''),
    account_name: '',
    txn_id: String(item.transfer_id || item.payout_reference || item.txn_id || '') || undefined,
    transfer_id: String(item.transfer_id || '') || undefined,
    payout_reference: String(item.payout_reference || '') || undefined,
    provider_code: String(item.provider_code || '') || undefined,
    status: item.status === 'approved' || item.status === 'rejected' ? item.status : 'pending',
    created_at: String(item.created_at || ''),
    admin_note: String(item.admin_note || '') || undefined,
  };
}

function mapTransaction(item: Record<string, unknown>): WalletTransaction {
  return {
    id: String(item.id || ''),
    user_id: Number(item.user_id) || 0,
    kind: String(item.kind || ''),
    amount: Number(item.amount) || 0,
    balance_after: Number(item.balance_after) || 0,
    description: String(item.description || ''),
    created_at: String(item.created_at || ''),
    user_identifier: String(item.user_identifier || '') || undefined,
    reference_key: String(item.reference_key || '') || undefined,
  };
}

export function useAppStore() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User>(EMPTY_USER);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [providers, setProviders] = useState<ProviderConnection[]>([]);
  const [adminData, setAdminData] = useState<AdminFinanceData>(EMPTY_ADMIN_DATA);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [wingoBets, setWingoBets] = useState<WinGoBet[]>([]);
  const [wingoHistory, setWingoHistory] = useState<WinGoRoundResult[]>([
    { period_id: '20261030100050160', interval: 0.5, result_number: 3, colors: ['green'], ended_at: '10:00:00' },
    { period_id: '20261030100050159', interval: 0.5, result_number: 8, colors: ['red'], ended_at: '09:59:30' },
    { period_id: '20261030100050158', interval: 0.5, result_number: 1, colors: ['green'], ended_at: '09:59:00' },
    { period_id: '20261030100050157', interval: 0.5, result_number: 0, colors: ['red', 'violet'], ended_at: '09:58:30' },
    { period_id: '20261030100050156', interval: 0.5, result_number: 6, colors: ['red'], ended_at: '09:58:00' },
  ]);
  const [wheelHistory, setWheelHistory] = useState<WheelRound[]>([]);

  const refreshWalletData = useCallback(async () => {
    const response = await fetch('/api/wallet/summary', { cache: 'no-store', credentials: 'same-origin' });
    const data = await responseData(response);
    const wallet = data.wallet && typeof data.wallet === 'object' ? data.wallet as Record<string, unknown> : {};
    setCurrentUser((current) => ({
      ...current,
      wallet_balance: Number(wallet.available) || 0,
      reserved_balance: Number(wallet.reserved) || 0,
    }));
    setTransactions(Array.isArray(data.transactions) ? data.transactions.map((item) => mapTransaction(item as Record<string, unknown>)) : []);
    setRequests(Array.isArray(data.requests) ? data.requests.map((item) => mapRequest(item as Record<string, unknown>)) : []);
    setProviders(Array.isArray(data.providers) ? data.providers as ProviderConnection[] : []);
    return data;
  }, []);

  const refreshAdminData = useCallback(async () => {
    setAdminLoading(true);
    setAdminError(null);
    try {
      const response = await fetch('/api/admin/wallet', { cache: 'no-store', credentials: 'same-origin' });
      const data = await responseData(response);
      const rows = (value: unknown) => Array.isArray(value) ? value.map((item) => item as Record<string, unknown>) : [];
      const stats = data.stats && typeof data.stats === 'object' ? data.stats as Record<string, unknown> : {};
      setAdminData({
        stats: {
          totalUsers: Number(stats.totalUsers) || 0,
          pendingDeposits: Number(stats.pendingDeposits) || 0,
          pendingWithdrawals: Number(stats.pendingWithdrawals) || 0,
          approvedDeposits: Number(stats.approvedDeposits) || 0,
          approvedWithdrawals: Number(stats.approvedWithdrawals) || 0,
          walletTotal: Number(stats.walletTotal) || 0,
          walletReserved: Number(stats.walletReserved) || 0,
          walletAvailable: Number(stats.walletAvailable) || 0,
        },
        requests: rows(data.requests).map(mapRequest),
        users: rows(data.users).map((row) => ({
          id: String(row.id || ''),
          identifier: String(row.identifier || ''),
          identifier_type: row.identifier_type === 'email' ? 'email' : 'phone',
          status: row.status === 'suspended' ? 'suspended' : 'active',
          created_at: String(row.created_at || ''),
          balance: Number(row.balance) || 0,
          reserved: Number(row.reserved) || 0,
          available: Number(row.available) || 0,
        })),
        transactions: rows(data.transactions).map(mapTransaction),
        providers: rows(data.providers) as unknown as ProviderConnection[],
      });
      return data;
    } catch (error) {
      setAdminError((error as Error).message || 'Admin စာရင်းကို မရယူနိုင်ပါ။');
      throw error;
    } finally {
      setAdminLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const loadSession = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          cache: 'no-store', credentials: 'same-origin', signal: controller.signal,
        });
        const result = response.ok ? await response.json() : { user: null };
        if (controller.signal.aborted) return;
        const account = result.user;
        if (!account) {
          setCurrentUser(EMPTY_USER);
          setTransactions([]);
          setRequests([]);
          setProviders([]);
          setAdminData(EMPTY_ADMIN_DATA);
          setIsUserLoggedIn(false);
          return;
        }
        setCurrentUser({
          id: Number(account.id) || 0,
          login_identifier: String(account.identifier || ''),
          role: account.role === 'admin' ? 'admin' : 'user',
          status: account.status === 'suspended' ? 'suspended' : 'active',
          wallet_balance: 0,
          reserved_balance: 0,
          created_at: account.createdAt || new Date().toISOString(),
        });
        setIsUserLoggedIn(true);
        try { await refreshWalletData(); }
        catch { /* Balance remains zero until the next successful server refresh. */ }
      } catch {
        if (!controller.signal.aborted) {
          setCurrentUser(EMPTY_USER);
          setTransactions([]);
          setRequests([]);
          setProviders([]);
          setAdminData(EMPTY_ADMIN_DATA);
          setIsUserLoggedIn(false);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoaded(true);
      }
    };
    void loadSession();
    return () => controller.abort();
  }, [refreshWalletData]);

  useEffect(() => {
    if (!isUserLoggedIn) return;
    const timer = window.setInterval(() => { void refreshWalletData().catch(() => undefined); }, 30_000);
    return () => window.clearInterval(timer);
  }, [isUserLoggedIn, refreshWalletData]);

  useEffect(() => {
    if (!isUserLoggedIn || currentUser.role !== 'admin') return;
    const initialTimer = window.setTimeout(() => { void refreshAdminData().catch(() => undefined); }, 0);
    const timer = window.setInterval(() => { void refreshAdminData().catch(() => undefined); }, 30_000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [isUserLoggedIn, currentUser.role, refreshAdminData]);

  const submitDeposit = useCallback(async (phone: string, transferId: string) => {
    const response = await fetch('/api/wallet/requests', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'deposit', phone, transferId }),
    });
    const data = await responseData(response);
    await refreshWalletData();
    if (currentUser.role === 'admin') await refreshAdminData().catch(() => undefined);
    return data;
  }, [currentUser.role, refreshAdminData, refreshWalletData]);

  const submitWithdrawal = useCallback(async (amount: number, phone: string) => {
    const response = await fetch('/api/wallet/requests', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'withdrawal', amount, phone }),
    });
    const data = await responseData(response);
    await refreshWalletData();
    if (currentUser.role === 'admin') await refreshAdminData().catch(() => undefined);
    return data;
  }, [currentUser.role, refreshAdminData, refreshWalletData]);

  const reviewPaymentRequest = useCallback(async (id: string, payload: AdminReviewPayload) => {
    const response = await fetch(`/api/admin/wallet/requests/${encodeURIComponent(id)}`, {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await responseData(response);
    await Promise.all([refreshAdminData(), refreshWalletData().catch(() => undefined)]);
    return data;
  }, [refreshAdminData, refreshWalletData]);

  const saveProvider = useCallback(async (provider: ProviderConnection) => {
    const response = await fetch('/api/admin/wallet/providers', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: provider.code,
        name: provider.name,
        receiverPhone: provider.receiver_phone,
        receiverName: provider.receiver_name,
        status: provider.status,
      }),
    });
    const data = await responseData(response);
    await Promise.all([refreshAdminData(), refreshWalletData().catch(() => undefined)]);
    return data;
  }, [refreshAdminData, refreshWalletData]);

  const logoutUser = useCallback(async () => {
    const response = await fetch('/api/auth/logout', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
    }).catch(() => null);
    if (response?.ok) {
      setIsUserLoggedIn(false);
      setCurrentUser(EMPTY_USER);
      setTransactions([]);
      setRequests([]);
      setProviders([]);
      setAdminData(EMPTY_ADMIN_DATA);
    }
  }, []);

  const placeWinGoBet = (interval: number, periodId: string, pickType: 'color' | 'size' | 'number', pickValue: string, stakeMMK: number): WinGoBet => {
    if (currentUser.wallet_balance < stakeMMK) {
      throw new Error('လောင်းကြေးအတွက် MMK လက်ကျန်ငွေ မလုံလောက်ပါ။');
    }
    const newBalance = Math.max(0, currentUser.wallet_balance - stakeMMK);
    setCurrentUser((prev) => ({ ...prev, wallet_balance: newBalance }));

    const newBet: WinGoBet = {
      id: `wb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: currentUser.id,
      period_id: periodId,
      interval,
      pick_type: pickType,
      pick_value: pickValue,
      stake: stakeMMK,
      payout: 0,
      result_number: null,
      status: 'pending',
      created_at: new Date().toLocaleTimeString(),
    };

    setWingoBets((prev) => [newBet, ...prev]);

    const tx: WalletTransaction = {
      id: `tx_${Date.now()}`,
      user_id: currentUser.id,
      kind: 'wingo_stake',
      amount: -stakeMMK,
      balance_after: newBalance,
      description: `WinGo (${interval >= 1 ? `${interval}m` : '30s'}) လောင်းကြေး - ${pickType}: ${pickValue}`,
      created_at: new Date().toISOString(),
    };
    setTransactions((prev) => [tx, ...prev]);

    return newBet;
  };

  const settleWinGoRound = (interval: number, periodId: string) => {
    // Current user pending bets for this period
    const currentBets = wingoBets.filter((b) => b.period_id === periodId && b.status === 'pending');

    // Auto-Win algorithm: the side with less bet/money automatically wins!
    const autoWinRes = determineWinGoAutoWin(
      currentBets.map((b) => ({
        pick_type: b.pick_type,
        pick_value: b.pick_value,
        stake: b.stake,
      }))
    );

    const resultNumber = autoWinRes.resultNumber;
    const colors = autoWinRes.colors;

    let totalUserPayout = 0;
    let totalUserStake = 0;
    const winningBetsList: Array<{ pick_type: string; pick_value: string; stake: number; payout: number }> = [];

    currentBets.forEach((b) => {
      totalUserStake += b.stake;
      const won = checkWinGoMatch(b.pick_type, b.pick_value, resultNumber);
      if (won) {
        const payout = calculateWinGoPayout(b.pick_type, b.pick_value, b.stake, resultNumber);
        totalUserPayout += payout;
        winningBetsList.push({
          pick_type: b.pick_type,
          pick_value: b.pick_value,
          stake: b.stake,
          payout,
        });
      }
    });

    setWingoBets((prev) =>
      prev.map((b) => {
        if (b.period_id === periodId && b.status === 'pending') {
          const won = checkWinGoMatch(b.pick_type, b.pick_value, resultNumber);
          const payout = won ? calculateWinGoPayout(b.pick_type, b.pick_value, b.stake, resultNumber) : 0;
          return {
            ...b,
            result_number: resultNumber,
            status: won ? 'won' : 'lost',
            payout,
          };
        }
        return b;
      })
    );

    if (totalUserPayout > 0) {
      setCurrentUser((prev) => {
        const updatedBal = prev.wallet_balance + totalUserPayout;
        const tx: WalletTransaction = {
          id: `tx_win_${Date.now()}`,
          user_id: prev.id,
          kind: 'wingo_payout',
          amount: totalUserPayout,
          balance_after: updatedBal,
          description: `WinGo ဆုကြေးငွေ ထုတ်ယူမှု (+${totalUserPayout.toLocaleString()} MMK)`,
          created_at: new Date().toISOString(),
        };
        setTransactions((currTx) => [tx, ...currTx]);
        return { ...prev, wallet_balance: updatedBal };
      });
    }

    setWingoHistory((prev) => [
      {
        period_id: periodId,
        interval,
        result_number: resultNumber,
        colors,
        ended_at: new Date().toLocaleTimeString(),
      },
      ...prev.slice(0, 49),
    ]);

    return {
      resultNumber,
      colors,
      userWon: totalUserPayout > 0,
      totalPayout: totalUserPayout,
      totalStake: totalUserStake,
      winningBets: winningBetsList,
      userHadBets: currentBets.length > 0,
    };
  };

  const placeVariantBet = (variant: 'k3' | '5d' | 'trx', interval: number, periodId: string, selection: string, stakeMMK: number) => {
    if (currentUser.wallet_balance < stakeMMK) {
      throw new Error('လောင်းကြေးအတွက် MMK လက်ကျန်ငွေ မလုံလောက်ပါ။');
    }
    const newBalance = Math.max(0, currentUser.wallet_balance - stakeMMK);
    setCurrentUser((prev) => ({ ...prev, wallet_balance: newBalance }));

    const tx: WalletTransaction = {
      id: `tx_${Date.now()}`,
      user_id: currentUser.id,
      kind: `${variant}_stake`,
      amount: -stakeMMK,
      balance_after: newBalance,
      description: `${variant.toUpperCase()} (${selection}) လောင်းကြေး - #${periodId}`,
      created_at: new Date().toISOString(),
    };
    setTransactions((prev) => [tx, ...prev]);

    return { success: true, newBalance };
  };

  const settleVariantWin = (variant: 'k3' | '5d' | 'trx', periodId: string, selection: string, payoutMMK: number, _result: string) => {
    setCurrentUser((prev) => {
      const newBal = prev.wallet_balance + payoutMMK;
      const tx: WalletTransaction = {
        id: `tx_${Date.now()}`,
        user_id: prev.id,
        kind: `${variant}_payout`,
        amount: payoutMMK,
        balance_after: newBal,
        description: `${variant.toUpperCase()} (${selection}) ဆုငွေ ထုတ်ယူမှု - #${periodId}`,
        created_at: new Date().toISOString(),
      };
      setTransactions((currTx) => [tx, ...currTx]);
      return { ...prev, wallet_balance: newBal };
    });
  };

  const spinWheel = (stakeMMK: number): { multiplier: number; payout: number; finalBalance: number } => {
    if (currentUser.wallet_balance < stakeMMK) {
      throw new Error('ကံစမ်းဘီးလှည့်ရန် MMK လက်ကျန်ငွေ မလုံလောက်ပါ။');
    }
    const multipliers = [1, 2, 3, 1, 5, 2, 0, 10];
    const multiplier = multipliers[Math.floor(Math.random() * multipliers.length)];
    const payout = Math.floor(stakeMMK * multiplier);
    const newBal = currentUser.wallet_balance - stakeMMK + payout;

    setCurrentUser((prev) => ({ ...prev, wallet_balance: newBal }));

    setWheelHistory((prev) => [
      {
        id: `wh_${Date.now()}`,
        user_id: currentUser.id,
        stake: stakeMMK,
        multiplier,
        payout,
        created_at: new Date().toLocaleTimeString(),
      },
      ...prev.slice(0, 30),
    ]);

    const tx: WalletTransaction = {
      id: `tx_wh_${Date.now()}`,
      user_id: currentUser.id,
      kind: 'wheel_spin',
      amount: payout - stakeMMK,
      balance_after: newBal,
      description: `ကံစမ်းဘီးလှည့် ရလဒ် (${multiplier}X)`,
      created_at: new Date().toISOString(),
    };
    setTransactions((prev) => [tx, ...prev]);

    return { multiplier, payout, finalBalance: newBal };
  };

  const claimStarterBonus = () => {
    const bonus = 50000;
    setCurrentUser((prev) => {
      const newBal = prev.wallet_balance + bonus;
      const tx: WalletTransaction = {
        id: `tx_bonus_${Date.now()}`,
        user_id: prev.id,
        kind: 'bonus',
        amount: bonus,
        balance_after: newBal,
        description: 'စမ်းသပ်ကစားရန် လက်ဆောင် (+50,000 MMK)',
        created_at: new Date().toISOString(),
      };
      setTransactions((curr) => [tx, ...curr]);
      return { ...prev, wallet_balance: newBal };
    });
  };

  return {
    isLoaded, isUserLoggedIn, currentUser, transactions, requests, providers,
    adminData, adminLoading, adminError,
    wingoBets, wingoHistory, wheelHistory,
    refreshWalletData, refreshAdminData, submitDeposit, submitWithdrawal,
    reviewPaymentRequest, saveProvider, logoutUser,
    spinWheel, placeWinGoBet, settleWinGoRound, placeVariantBet, settleVariantWin, claimStarterBonus,
  };
}
