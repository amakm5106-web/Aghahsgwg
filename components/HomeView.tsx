'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Volume2, ChevronRight, Sparkles, Trophy, Flame, Ticket, Dices, Hash, Disc } from 'lucide-react';
import type { User } from '@/lib/store';

interface HomeViewProps {
  currentUser: User;
  onNavigate: (tab: string) => void;
}

const lotteryCategories = [
  { id: 'all', title: 'အားလုံး (All)', icon: Ticket },
  { id: 'wingo', title: 'Win Go', icon: Disc, action: 'wingo' },
  { id: 'k3', title: 'K3 အံစာတုံး', icon: Dices, action: 'k3' },
  { id: '5d', title: '5D ထီဂိမ်း', icon: Hash, action: '5d' },
  { id: 'trx', title: 'Trx Win', icon: Sparkles, action: 'trx' },
];

const lotteryGames = [
  {
    name: 'Win Go',
    tag: 'Official 1M · 3M · 5M',
    description: 'Guess Number · အရောင်/ဂဏန်း ရွေးချယ်မှု',
    detail: 'Green / Red / Violet ဖြင့် အနိုင်ရယူပါ',
    image: '/cklottery/lotterycategory/win-go.png',
    action: 'wingo',
    featured: true,
  },
  {
    name: 'K3',
    tag: 'Three Dices',
    description: 'အံစာတုံး ၃ လုံး ကံစမ်းဂိမ်း',
    detail: 'Big / Small / Odd / Even · Sum Guessing',
    image: '/cklottery/lotterycategory/k3.png',
    action: 'k3',
  },
  {
    name: '5D',
    tag: 'Five Digits Lottery',
    description: 'ဂဏန်း ၅ လုံး ကံစမ်းထီ',
    detail: 'A/B/C/D/E ဂဏန်းပေါင်းလဒ် Big / Small',
    image: '/cklottery/lotterycategory/5d.png',
    action: '5d',
  },
  {
    name: 'Trx Win',
    tag: 'Block Hash Lottery',
    description: 'Hash-style Blockchain ရလဒ်',
    detail: 'Color & Size မှန်းဆ ကံစမ်းမှု',
    image: '/cklottery/lotterycategory/trx-win.png',
    action: 'trx',
  },
];

const banners = [
  { image: '/cklottery/png/banner-wccltQJr.png', alt: 'AzLottery promotions' },
  { image: '/cklottery/png/MyCoinsBanner-DdbMZNYq.png', alt: 'Rewards and coins' },
  { image: '/cklottery/png/superjackpotHome-BSFlrooL.png', alt: 'Super jackpot' },
];

export const HomeView: React.FC<HomeViewProps> = ({ currentUser, onNavigate }) => {
  const [activeBanner, setActiveBanner] = useState(0);
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredGames = activeCategory === 'all'
    ? lotteryGames
    : lotteryGames.filter((g) => g.action === activeCategory);

  return (
    <div className="lobby-page space-y-4">
      {/* Banner Carousel */}
      <section className="lobby-banner" aria-label="Promotions">
        <Image
          src={banners[activeBanner].image}
          alt={banners[activeBanner].alt}
          fill
          priority
          sizes="(max-width: 480px) 100vw, 480px"
          className="lobby-banner-image"
        />
        <div className="lobby-banner-dots" aria-label="Select promotion">
          {banners.map((banner, index) => (
            <button
              key={banner.image}
              type="button"
              onClick={() => setActiveBanner(index)}
              className={activeBanner === index ? 'active' : ''}
              aria-label={`Promotion ${index + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Notice Marquee */}
      <button type="button" className="lobby-notice" onClick={() => onNavigate('promotion')}>
        <span className="lobby-notice-icon">
          <Volume2 size={16} />
        </span>
        <span className="lobby-notice-copy">AzLottery တရားဝင် ထီဂိမ်းများ နှင့် အလိုအလျောက် ငွေသွင်း/ငွေထုတ် စနစ်</span>
        <ChevronRight size={17} className="lobby-notice-arrow" />
      </button>

      {/* Lottery Categories Switcher Bar */}
      <section className="bg-white rounded-2xl p-2.5 shadow-xs border border-slate-200" aria-label="Lottery Categories">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {lotteryCategories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id);
                  if (cat.action) {
                    onNavigate(cat.action);
                  }
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-[#7a1f2b] text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
                }`}
              >
                <Icon size={14} />
                <span>{cat.title}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Lottery Games Section Only (Pure Lottery) */}
      <section className="lobby-lottery-section" id="lobby-lottery-games" aria-label="Lottery games">
        <div className="lobby-section-heading">
          <h2>
            <span className="lobby-heading-mark">
              <Sparkles size={14} />
            </span>
            <span>Lottery Games (တရားဝင် ထီဂိမ်းများ)</span>
          </h2>
          <span className="text-[11px] font-bold text-[#7a1f2b] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            {filteredGames.length} ခု
          </span>
        </div>

        <div className="lobby-lottery-grid">
          {filteredGames.map((game) => (
            <button
              type="button"
              key={game.name}
              className={`lobby-lottery-card ${game.featured ? 'featured' : ''} cursor-pointer hover:shadow-md transition-shadow`}
              onClick={() => onNavigate(game.action)}
            >
              <span className="lobby-lottery-copy">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/80 block mb-0.5">
                  {game.tag}
                </span>
                <strong className="text-lg font-black text-white">{game.name}</strong>
                <small className="text-white/90 text-xs font-semibold">{game.description}</small>
                <small className="text-white/70 text-[11px]">{game.detail}</small>
              </span>
              <span className="lobby-lottery-art">
                <Image
                  src={game.image}
                  alt={`${game.name} lottery game`}
                  fill
                  sizes="120px"
                  className="lobby-lottery-image"
                />
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Winning Information */}
      <section className="lobby-winners">
        <div className="lobby-section-heading">
          <h2>
            <span className="lobby-heading-mark winner-mark">
              <Trophy size={14} />
            </span>
            <span>Winning Information (အနိုင်ရရှိမှု ဇယား)</span>
          </h2>
          <button type="button" onClick={() => onNavigate('transactions')}>
            <span>မှတ်တမ်း</span> <ChevronRight size={14} />
          </button>
        </div>
        <div className="lobby-winner-row">
          <span className="lobby-winner-avatar">
            <Sparkles size={15} />
          </span>
          <span className="lobby-winner-label">သင့်လက်ကျန် အနိုင်ငွေ</span>
          <span className="lobby-winner-amount">
            <Flame size={13} /> {(currentUser?.wallet_balance ?? 0).toLocaleString()} MMK
          </span>
        </div>
      </section>

      <div className="lobby-bottom-space" />
    </div>
  );
};
