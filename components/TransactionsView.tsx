'use client';

import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  CircleDollarSign,
  Clock3,
  Gamepad2,
  Gift,
  History,
  Search,
  Wallet,
} from 'lucide-react';
import type { User, WalletTransaction } from '@/lib/store';

type ActivityFilter = 'all' | 'deposit' | 'withdrawal' | 'wingo' | 'wheel';

const filters: { id: ActivityFilter; label: string }[] = [
  { id: 'all', label: 'အားလုံး' },
  { id: 'deposit', label: 'ငွေသွင်း / လက်ဆောင်' },
  { id: 'withdrawal', label: 'ငွေထုတ်' },
  { id: 'wingo', label: 'WinGo' },
  { id: 'wheel', label: 'ကံစမ်းဘီး' },
];

const formatMmk = (amount: number) => `${Math.abs(amount).toLocaleString('en-US')} MMK`;

const formatDate = (value: string) => {
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('my-MM', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const getActivityLabel = (kind: WalletTransaction['kind']) => {
  switch (kind) {
    case 'deposit': return 'ငွေသွင်း';
    case 'bonus': return 'လက်ဆောင်ရရှိမှု';
    case 'withdrawal': return 'ငွေထုတ်';
    case 'wingo_stake': return 'WinGo လောင်းကြေး';
    case 'wingo_payout': return 'WinGo ဆုငွေ';
    case 'wheel_stake': return 'ကံစမ်းဘီး လောင်းကြေး';
    case 'wheel_payout': return 'ကံစမ်းဘီး ဆုငွေ';
    case 'adjustment': return 'စာရင်းပြင်ဆင်မှု';
    default: return 'Wallet စာရင်း';
  }
};

const getActivityIcon = (kind: WalletTransaction['kind']) => {
  switch (kind) {
    case 'deposit': return ArrowDownLeft;
    case 'bonus': return Gift;
    case 'withdrawal': return ArrowUpRight;
    case 'wingo_stake':
    case 'wingo_payout': return Gamepad2;
    case 'wheel_stake':
    case 'wheel_payout': return CircleDollarSign;
    default: return Activity;
  }
};

const matchesFilter = (transaction: WalletTransaction, filter: ActivityFilter) => {
  if (filter === 'deposit') return transaction.kind === 'deposit' || transaction.kind === 'bonus';
  if (filter === 'withdrawal') return transaction.kind === 'withdrawal';
  if (filter === 'wingo') return transaction.kind === 'wingo_stake' || transaction.kind === 'wingo_payout';
  if (filter === 'wheel') return transaction.kind === 'wheel_stake' || transaction.kind === 'wheel_payout';
  return true;
};

interface TransactionsViewProps {
  currentUser: User;
  transactions: WalletTransaction[];
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({ currentUser, transactions }) => {
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [query, setQuery] = useState('');

  const userTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.user_id === currentUser.id),
    [transactions, currentUser.id],
  );
  const incomingTotal = userTransactions.reduce((total, transaction) => total + Math.max(transaction.amount, 0), 0);
  const outgoingTotal = userTransactions.reduce((total, transaction) => total + Math.max(-transaction.amount, 0), 0);

  const filteredTransactions = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return userTransactions
      .filter((transaction) => matchesFilter(transaction, filter))
      .filter((transaction) => !needle || `${transaction.description} ${getActivityLabel(transaction.kind)} ${transaction.amount}`.toLocaleLowerCase().includes(needle))
      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
  }, [filter, query, userTransactions]);

  return (
    <section className="activity-page" aria-labelledby="activity-title">
      <header className="activity-hero">
        <div className="activity-hero-copy">
          <span className="activity-kicker"><Activity size={14} /> AZLOTTERY LEDGER</span>
          <h1 id="activity-title">Activity</h1>
          <p>ငွေကြေးနှင့် ဂိမ်းမှတ်တမ်းများကို တစ်နေရာတည်းမှာ စစ်ဆေးနိုင်ပါသည်။</p>
        </div>
        <div className="activity-balance-card">
          <span><Wallet size={15} /> လက်ရှိလက်ကျန်</span>
          <strong>{formatMmk(currentUser.wallet_balance ?? 0)}</strong>
          <small>AzLottery wallet</small>
        </div>
      </header>

      <div className="activity-summary-grid" aria-label="Activity အကျဉ်းချုပ်">
        <article className="activity-summary-card">
          <span className="activity-summary-icon wine"><History size={17} /></span>
          <small>မှတ်တမ်းစုစုပေါင်း</small>
          <strong>{userTransactions.length.toLocaleString()}</strong>
          <span className="activity-summary-foot">သင့်အကောင့်၏ activity များ</span>
        </article>
        <article className="activity-summary-card">
          <span className="activity-summary-icon green"><ArrowDownLeft size={17} /></span>
          <small>ဝင်ငွေစုစုပေါင်း</small>
          <strong>{formatMmk(incomingTotal)}</strong>
          <span className="activity-summary-foot">မှတ်တမ်းတင်ထားသော ငွေဝင်များ</span>
        </article>
        <article className="activity-summary-card">
          <span className="activity-summary-icon gold"><ArrowUpRight size={17} /></span>
          <small>အသုံးပြုမှုစုစုပေါင်း</small>
          <strong>{formatMmk(outgoingTotal)}</strong>
          <span className="activity-summary-foot">မှတ်တမ်းတင်ထားသော ငွေထွက်များ</span>
        </article>
      </div>

      <section className="activity-ledger-card" aria-label="Activity မှတ်တမ်း">
        <div className="activity-ledger-heading">
          <div>
            <span className="activity-section-kicker">သင့်စာရင်းစာအုပ်</span>
            <h2>မှတ်တမ်းများ</h2>
          </div>
          <label className="activity-search">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="မှတ်တမ်း ရှာရန်"
              aria-label="Activity မှတ်တမ်းရှာရန်"
            />
          </label>
        </div>

        <div className="activity-filter-row" role="group" aria-label="Activity အမျိုးအစားစစ်ရန်">
          {filters.map((item) => {
            const count = item.id === 'all'
              ? userTransactions.length
              : userTransactions.filter((transaction) => matchesFilter(transaction, item.id)).length;
            return (
              <button
                key={item.id}
                type="button"
                className={`activity-filter ${filter === item.id ? 'active' : ''}`}
                onClick={() => setFilter(item.id)}
                aria-pressed={filter === item.id}
              >
                {item.label}<span>{count}</span>
              </button>
            );
          })}
        </div>

        <div className="activity-list" aria-live="polite">
          {filteredTransactions.length === 0 ? (
            <div className="activity-empty">
              <span className="activity-empty-icon"><Clock3 size={22} /></span>
              <strong>{query ? 'ကိုက်ညီသော မှတ်တမ်း မတွေ့ပါ' : 'မှတ်တမ်း မရှိသေးပါ'}</strong>
              <p>{query ? 'အခြားစကားလုံးဖြင့် ရှာကြည့်ပါ။' : 'သင့်ငွေသွင်း၊ အသုံးပြုမှုနှင့် ဆုငွေမှတ်တမ်းများ ရှိလာပါက ဤနေရာတွင် ဖော်ပြပါမည်။'}</p>
            </div>
          ) : filteredTransactions.map((transaction) => {
            const positive = transaction.amount > 0;
            const Icon = getActivityIcon(transaction.kind);
            return (
              <article className="activity-row" key={transaction.id}>
                <span className={`activity-row-icon ${positive ? 'credit' : 'debit'}`}><Icon size={19} /></span>
                <div className="activity-row-copy">
                  <strong>{getActivityLabel(transaction.kind)}</strong>
                  <p>{transaction.description}</p>
                  <time dateTime={transaction.created_at}>{formatDate(transaction.created_at)}</time>
                </div>
                <div className="activity-row-amount">
                  <strong className={positive ? 'credit-text' : 'debit-text'}>{positive ? '+' : '−'}{formatMmk(transaction.amount)}</strong>
                  <small>လက်ကျန် {formatMmk(transaction.balance_after)}</small>
                </div>
              </article>
            );
          })}
        </div>
        <footer className="activity-ledger-footer">
          <span><Clock3 size={14} /> နောက်ဆုံးမှတ်တမ်းကို အပေါ်တွင်ပြထားသည်</span>
          <span>{filteredTransactions.length.toLocaleString()} ခု</span>
        </footer>
      </section>
    </section>
  );
};
