'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { User } from '@/lib/store';
import {
  BarChart3,
  Check,
  Clipboard,
  Copy,
  Gift,
  Link2,
  List,
  Network,
  Share2,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
} from 'lucide-react';

type PromotionViewProps = {
  onNavigate: (tab: string) => void;
  currentUser: User;
};

type ReferralTab = 'overview' | 'team' | 'commission' | 'rules';
type ReferralMember = { tier: number; identifier: string; joinedAt: string };
type ReferralActivity = {
  type: 'registration' | 'deposit' | 'game';
  tier: number;
  member: string;
  commissionMmk: number;
  createdAt: string;
};
type ReferralSummary = {
  referralCode: string;
  directCount: number;
  teamCount: number;
  countsByTier: { tier: number; count: number }[];
  weekCommissionMmk: number;
  totalCommissionMmk: number;
  membersTruncated: boolean;
  members: ReferralMember[];
  activities: ReferralActivity[];
};

const ruleItems = [
  'သင့် invite link သို့မဟုတ် code ဖြင့် စာရင်းသွင်းသူသည် Tier 1 အဖွဲ့ဝင် ဖြစ်ပါမည်။',
  'သင့်အဖွဲ့ဝင်များမှ ဖိတ်ခေါ်လာသူများကို အဆင့် ၆ ဆင့်အထိ team အတွင်းပြသပါမည်။',
  'Commission ရရှိမှုကို server မှ မှတ်တမ်းတင်ထားသော အရည်အချင်းပြည့်မီသည့် activity အပေါ်သာတွက်ချက်ပါမည်။',
  'လက်ရှိမှတ်တမ်းမရှိသေးပါက commission ကို 0 MMK အဖြစ် ရှင်းလင်းစွာပြသပါမည်။',
];

const formatMmk = (amount: number) => `${amount.toLocaleString()} MMK`;
const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('my-MM', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const PromotionView: React.FC<PromotionViewProps> = ({ onNavigate, currentUser }) => {
  const [activeTab, setActiveTab] = useState<ReferralTab>('overview');
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [loadState, setLoadState] = useState<{ userId: number; summary?: ReferralSummary; error?: string; loading: boolean }>({ userId: 0, loading: false });
  const [copyError, setCopyError] = useState('');
  const isSignedIn = currentUser.id > 0 && Boolean(currentUser.login_identifier);
  const hasCurrentData = isSignedIn && loadState.userId === currentUser.id;
  const summary = hasCurrentData ? loadState.summary ?? null : null;
  const loading = isSignedIn && (!hasCurrentData || loadState.loading);
  const error = (hasCurrentData ? loadState.error ?? '' : '') || copyError;

  useEffect(() => {
    if (!isSignedIn) return;
    const controller = new AbortController();
    fetch('/api/agent/referral', {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Referral အချက်အလက်ကို မရယူနိုင်ပါ။');
        return result as ReferralSummary;
      })
      .then((result) => {
        if (!controller.signal.aborted) setLoadState({ userId: currentUser.id, summary: result, loading: false });
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setLoadState({
          userId: currentUser.id,
          error: reason instanceof Error ? reason.message : 'Referral အချက်အလက်ကို မရယူနိုင်ပါ။',
          loading: false,
        });
      });
    return () => controller.abort();
  }, [isSignedIn, currentUser.id]);

  const invitationCode = summary?.referralCode ?? '';
  const invitationLink = useMemo(() => {
    if (typeof window === 'undefined' || !invitationCode) return '';
    return `${window.location.origin}/signup?invite=${encodeURIComponent(invitationCode)}`;
  }, [invitationCode]);

  const copyValue = async (value: string, kind: 'code' | 'link') => {
    if (!value) return;
    try {
      setCopyError('');
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopyError('ကူးယူ၍မရပါ။ လင့်ခ်ကို ကိုယ်တိုင်ရွေးချယ်ကူးယူပါ။');
    }
  };

  const shareInvite = async () => {
    if (!invitationLink) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'AzLottery ဖိတ်ခေါ်လင့်ခ်', text: 'AzLottery တွင် အကောင့်ဖွင့်ရန်', url: invitationLink });
        return;
      } catch (reason) {
        if (reason instanceof Error && reason.name === 'AbortError') return;
      }
    }
    await copyValue(invitationLink, 'link');
  };

  const stats = [
    { label: 'ဒီအပတ် commission', value: summary ? formatMmk(summary.weekCommissionMmk) : '—', icon: BarChart3 },
    { label: 'စုစုပေါင်း commission', value: summary ? formatMmk(summary.totalCommissionMmk) : '—', icon: WalletCards },
    { label: 'တိုက်ရိုက်ဖိတ်ခေါ်သူ', value: summary ? String(summary.directCount) : '—', icon: Users },
    { label: 'Team အဖွဲ့ဝင်စုစုပေါင်း', value: summary ? String(summary.teamCount) : '—', icon: Network },
  ];

  return (
    <div className="promotion-page agent-page">
      <header className="promotion-heading agent-heading">
        <span className="promotion-eyebrow"><Gift /> Agent Promotion</span>
        <h1>Agent promotion center</h1>
        <p>သင့်ဖိတ်ခေါ်လင့်ခ်၊ အဖွဲ့ဝင်နှင့် commission မှတ်တမ်းကို တစ်နေရာတည်းမှာ ကြည့်ပါ။</p>
      </header>

      <section className="agent-hero-card">
        <div className="agent-hero-orb" aria-hidden="true"><Sparkles size={22} /></div>
        <div className="agent-hero-copy">
          <span>MY INVITATION</span>
          <strong>{!isSignedIn ? 'အကောင့်ဝင်ရန်လိုအပ်သည်' : loading && !summary ? 'ရယူနေသည်…' : invitationCode || 'ခဏအကြာ ပြန်စမ်းပါ'}</strong>
          <small>{isSignedIn ? 'သင့်အကောင့်အတွက် server မှ သတ်မှတ်ထားသော ကိုယ်ပိုင် invitation code' : 'အကောင့်ဝင်ပြီး ကိုယ်ပိုင် invitation code ကိုရယူပါ။'}</small>
        </div>
        <button
          type="button"
          className="agent-icon-button"
          onClick={() => copyValue(invitationCode, 'code')}
          aria-label="Invitation code ကူးရန်"
          disabled={!invitationCode}
        >
          {copied === 'code' ? <Check size={18} /> : <Copy size={18} />}
        </button>
      </section>

      <section className="agent-invite-card">
        <div className="agent-section-title"><Link2 size={17} /><span>ဖိတ်ခေါ်ရန် link</span></div>
        <div className="agent-link-row">
          <code>{invitationLink || (isSignedIn ? 'Referral code ရယူနေသည်…' : 'အကောင့်ဝင်ပြီးနောက် လင့်ခ်ကို ပြသပါမည်။')}</code>
          <button type="button" className="agent-copy-button" onClick={() => copyValue(invitationLink, 'link')} disabled={!invitationLink}>
            {copied === 'link' ? <><Check size={15} /> ကူးပြီးပါပြီ</> : <><Clipboard size={15} /> ကူးရန်</>}
          </button>
        </div>
        <button type="button" className="agent-share-button" onClick={isSignedIn ? shareInvite : () => onNavigate('account')} disabled={isSignedIn && !invitationLink}>
          <Share2 size={16} /> {isSignedIn ? 'သူငယ်ချင်းများကို ဖိတ်ခေါ်မည်' : 'အကောင့်ဝင်ရန်'}
        </button>
      </section>

      {error && <p className="agent-error" role="alert">{error}</p>}

      <section className="agent-stat-grid" aria-label="Agent summary" aria-live="polite">
        {stats.map(({ label, value, icon: Icon }) => (
          <div className="agent-stat-card" key={label}>
            <span className="agent-stat-icon"><Icon size={17} /></span>
            <strong>{value}</strong>
            <small>{label}</small>
          </div>
        ))}
      </section>

      <nav className="agent-tabs" aria-label="Agent center sections">
        {([
          ['overview', 'အကျဉ်းချုပ်', Sparkles],
          ['team', 'Team report', Users],
          ['commission', 'Commission', BarChart3],
          ['rules', 'စည်းမျဉ်းများ', List],
        ] as const).map(([id, label, Icon]) => (
          <button key={id} type="button" aria-pressed={activeTab === id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </nav>

      {activeTab === 'overview' && (
        <section className="agent-panel">
          <div className="agent-panel-heading"><div><span className="agent-kicker">AGENCY OVERVIEW</span><h2>သင့် referral အခြေအနေ</h2></div><ShieldCheck size={28} /></div>
          <p className="agent-muted">အဖွဲ့ဝင်အရေအတွက်နှင့် commission ကို database မှ တိုက်ရိုက်ပြသထားသည်။</p>
          {!isSignedIn ? (
            <div className="agent-empty-card"><Users size={22} /><strong>Agent dashboard ကိုကြည့်ရန် အကောင့်ဝင်ပါ</strong><span>အကောင့်ဝင်ပြီးမှ ကိုယ်ပိုင်ဖိတ်ခေါ်လင့်ခ်နှင့် အဖွဲ့မှတ်တမ်းကိုကြည့်နိုင်ပါမည်။</span><button type="button" onClick={() => onNavigate('account')}>အကောင့်သို့သွားရန်</button></div>
          ) : loading && !summary ? (
            <div className="agent-empty-card"><span className="agent-loading-dot" /><strong>အချက်အလက် ရယူနေပါသည်…</strong><span>သင့် referral အချက်အလက်ကို လုံခြုံစွာစစ်ဆေးနေသည်။</span></div>
          ) : summary ? (
            <>
              <div className="agent-tier-strip">
                {summary.countsByTier.map((tier) => <div key={tier.tier}><small>Tier {tier.tier}</small><strong>{tier.count.toLocaleString()}</strong></div>)}
              </div>
              {summary.teamCount === 0 && <div className="agent-empty-card compact"><Users size={22} /><strong>အဖွဲ့ဝင် မရှိသေးပါ</strong><span>သင့် invitation link ကို မျှဝေပြီး စတင်ဖိတ်ခေါ်နိုင်ပါသည်။</span></div>}
              <div className="agent-action-row">
                <button type="button" onClick={() => setActiveTab('team')}><Users size={16} /> Team report</button>
                <button type="button" onClick={() => setActiveTab('commission')}><BarChart3 size={16} /> Commission detail</button>
              </div>
            </>
          ) : <div className="agent-empty-card"><strong>အချက်အလက်ကို မရယူနိုင်ပါ</strong><span>ခဏအကြာ ပြန်လည်ကြိုးစားပါ။</span></div>}
        </section>
      )}

      {activeTab === 'team' && (
        <section className="agent-panel">
          <div className="agent-panel-heading"><div><span className="agent-kicker">TEAM REPORT</span><h2>အဖွဲ့ဝင်စာရင်း</h2></div><Network size={28} /></div>
          {!isSignedIn ? <div className="agent-empty-card compact"><strong>အကောင့်ဝင်ရန်လိုအပ်သည်</strong><span>အဖွဲ့ဝင်စာရင်းကို သင့်အကောင့်ဖြင့် ဝင်ပြီးကြည့်ပါ။</span></div> : loading && !summary ? <div className="agent-empty-card compact"><strong>အချက်အလက် ရယူနေသည်…</strong></div> : summary?.members.length ? (
            <>
              <div className="agent-table-head"><span>အဆင့်</span><span>အဖွဲ့ဝင် (ဖုံးကွယ်ထားသည်)</span><span>စာရင်းသွင်းသည့်နေ့</span></div>
              <div className="agent-member-list">
                {summary.members.map((member, index) => <div className="agent-member-row" key={`${member.tier}-${member.identifier}-${index}`}><strong>Tier {member.tier}</strong><span>{member.identifier}</span><time dateTime={member.joinedAt}>{formatDate(member.joinedAt)}</time></div>)}
              </div>
              {summary.membersTruncated && <p className="agent-muted">လတ်တလော အဖွဲ့ဝင် ၂၅၀ ဦးကိုသာ ပြသထားပါသည်။ စုစုပေါင်းအရေအတွက်မှာ {summary.teamCount.toLocaleString()} ဦးဖြစ်သည်။</p>}
              <div className="agent-activity-list">
                <h3>မကြာသေးမီ referral activity</h3>
                {summary.activities.slice(0, 8).map((activity, index) => <div className="agent-activity-row" key={`${activity.type}-${activity.createdAt}-${index}`}><span>{activity.type === 'registration' ? 'စာရင်းသွင်းမှု' : activity.type === 'deposit' ? 'အပ်ငွေ activity' : 'ဂိမ်း activity'} · Tier {activity.tier}</span><strong>{activity.member}</strong><time dateTime={activity.createdAt}>{formatDate(activity.createdAt)}</time></div>)}
                {!summary.activities.length && <p className="agent-muted">Referral activity မှတ်တမ်း မရှိသေးပါ။</p>}
              </div>
            </>
          ) : <div className="agent-empty-card compact"><Users size={22} /><strong>{error || 'အဖွဲ့ဝင် မတွေ့သေးပါ'}</strong><span>ဖိတ်ခေါ်မှုများ database တွင် မှတ်တမ်းဝင်လာပါက ဒီမှာပြပါမည်။</span></div>}
        </section>
      )}

      {activeTab === 'commission' && (
        <section className="agent-panel">
          <div className="agent-panel-heading"><div><span className="agent-kicker">COMMISSION DETAIL</span><h2>ဝင်ငွေမှတ်တမ်း</h2></div><WalletCards size={28} /></div>
          <div className="agent-commission-summary"><span>မှတ်တမ်းတင်ထားသော စုစုပေါင်း commission</span><strong>{summary ? formatMmk(summary.totalCommissionMmk) : '—'}</strong></div>
          <div className="agent-table-head"><span>ရက်စွဲ</span><span>အကြောင်းအရာ</span><span>ပမာဏ</span></div>
          {!isSignedIn ? <div className="agent-empty-card compact"><strong>အကောင့်ဝင်ရန်လိုအပ်သည်</strong></div> : loading && !summary ? <div className="agent-empty-card compact"><strong>အချက်အလက် ရယူနေသည်…</strong></div> : summary?.activities.filter((activity) => activity.commissionMmk > 0).length ? summary.activities.filter((activity) => activity.commissionMmk > 0).map((activity, index) => <div className="agent-commission-row" key={`${activity.createdAt}-${index}`}><time dateTime={activity.createdAt}>{formatDate(activity.createdAt)}</time><span>{activity.member} · Tier {activity.tier}</span><strong>{formatMmk(activity.commissionMmk)}</strong></div>) : <div className="agent-empty-card compact"><BarChart3 size={22} /><strong>{error || 'Commission မှတ်တမ်း မရှိသေးပါ'}</strong><span>အတည်ပြုထားသော commission ရှိလာပါက server မှ ဤနေရာတွင် ပြပါမည်။</span></div>}
        </section>
      )}

      {activeTab === 'rules' && (
        <section className="agent-panel">
          <div className="agent-panel-heading"><div><span className="agent-kicker">INVITATION RULES</span><h2>ဖိတ်ခေါ်ခြင်း စည်းမျဉ်းများ</h2></div><ShieldCheck size={28} /></div>
          <ol className="agent-rule-list">
            {ruleItems.map((rule, index) => <li key={rule}><span>{index + 1}</span><p>{rule}</p></li>)}
          </ol>
          <p className="agent-muted">Referral hierarchy သည် database မှ မှတ်တမ်းတင်ထားသည့် အချက်အလက်များအပေါ် မူတည်ပြီး Tier 1–6 အတွင်းသာ ပြသပါသည်။</p>
        </section>
      )}
    </div>
  );
};
