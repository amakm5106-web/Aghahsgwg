'use client';

import React from 'react';
import Link from 'next/link';
import { Lock, LogIn, UserPlus, X, Gamepad2, Wallet, Sparkles } from 'lucide-react';

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
}

export const LoginPromptModal: React.FC<LoginPromptModalProps> = ({
  isOpen,
  onClose,
  reason = 'ဂိမ်းများ ကစားရန် နှင့် ငွေသွင်း/ငွေထုတ် ပြုလုပ်ရန် အကောင့်ဝင်ရောက်ရန် လိုအပ်ပါသည်',
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-sm w-full p-6 text-center relative shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Hero Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#7a1f2b] to-[#963545] text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
          <Lock className="w-8 h-8" />
        </div>

        {/* Text */}
        <span className="text-[11px] font-extrabold text-[#7a1f2b] bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> AzLottery Member
        </span>

        <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-2">
          အကောင့်ဝင်ရောက်ရန် လိုအပ်ပါသည်
        </h3>

        <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed px-2">
          {reason}
        </p>

        {/* Features preview */}
        <div className="grid grid-cols-2 gap-2 my-4 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-left text-xs">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="text-slate-700 font-bold">ထီဂိမ်းအားလုံး</span>
          </div>
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-slate-700 font-bold">Auto ငွေသွင်း/ထုတ်</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <Link
            href="/login"
            className="w-full py-3 rounded-xl bg-[#7a1f2b] hover:bg-blue-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 transition-all"
          >
            <LogIn className="w-4 h-4" />
            <span>အကောင့်ဝင်ရောက်မည် (Login)</span>
          </Link>

          <Link
            href="/signup"
            className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm flex items-center justify-center gap-2 transition-all"
          >
            <UserPlus className="w-4 h-4 text-blue-600" />
            <span>အကောင့်သစ်ဖွင့်မည် (Sign Up)</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
