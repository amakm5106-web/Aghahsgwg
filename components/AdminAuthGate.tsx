'use client';

import React from 'react';
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react';

interface AdminAuthGateProps {
  children: React.ReactNode;
  userRole: 'user' | 'admin';
  onExit?: () => void;
}

export const AdminAuthGate: React.FC<AdminAuthGateProps> = ({ children, userRole, onExit }) => {
  if (userRole !== 'admin') {
    return (
      <section className="admin-access-denied" role="status">
        <span className="admin-access-icon"><Lock size={24} /></span>
        <p className="admin-access-eyebrow">AZLOTTERY · ADMIN</p>
        <h2>စီမံခန့်ခွဲသူ ဝင်ခွင့်လိုအပ်ပါသည်</h2>
        <p>အကောင့်အဆင့်ကို server မှ အတည်ပြုနိုင်မှသာ ဤစာမျက်နှာကို ဖွင့်နိုင်ပါသည်။</p>
        {onExit && <button type="button" onClick={onExit}><ArrowLeft size={16} /> ပင်မစာမျက်နှာသို့</button>}
      </section>
    );
  }

  return (
    <div className="admin-role-content">
      <div className="admin-role-status"><ShieldCheck size={16} /> Server allowlist မှ အတည်ပြုထားသော Admin session</div>
      {children}
    </div>
  );
};
