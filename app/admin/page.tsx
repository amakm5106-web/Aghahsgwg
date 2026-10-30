'use client';

import React from 'react';
import Link from 'next/link';
import { AdminView } from '@/components/AdminView';
import { AdminAuthGate } from '@/components/AdminAuthGate';
import { useAppStore } from '@/lib/store';
import { Home } from 'lucide-react';

export default function AdminPage() {
  const { isLoaded, currentUser, adminData, adminLoading, adminError, refreshAdminData, reviewPaymentRequest, saveProvider } = useAppStore();

  if (!isLoaded) {
    return <div className="flex min-h-screen items-center justify-center bg-[#070d19] text-white"><div className="flex flex-col items-center gap-3"><div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" /><span className="text-sm font-bold text-amber-400">Admin Panel ဖွင့်လှစ်နေပါသည်…</span></div></div>;
  }

  return (
    <div className="min-h-screen bg-[#070d19] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0d1627] px-3 py-3 sm:px-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/" className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-bold text-slate-200 transition-colors hover:bg-white/15 sm:px-3"><Home className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span>ပင်မစာမျက်နှာ</span></Link>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 sm:h-2.5 sm:w-2.5" /><span className="truncate text-xs font-black tracking-tight text-white sm:text-sm">Admin Dashboard</span></div>
          </div>
          <span className="hidden text-xs text-slate-400 sm:inline">အကောင့်: <b className="text-amber-400">{currentUser.login_identifier}</b></span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-3 sm:p-6 lg:p-8">
        <AdminAuthGate userRole={currentUser.role} onExit={() => window.location.assign('/')}>
          <AdminView data={adminData} isLoading={adminLoading} error={adminError} onRefresh={refreshAdminData} onReview={reviewPaymentRequest} onSaveProvider={saveProvider} />
        </AdminAuthGate>
      </main>
    </div>
  );
}
