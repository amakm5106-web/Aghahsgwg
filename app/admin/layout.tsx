import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSessionUser, SESSION_COOKIE } from '@/lib/auth/core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  let isAdmin = false;

  try {
    const user = await getSessionUser(cookieStore.get(SESSION_COOKIE)?.value);
    isAdmin = user?.role === 'admin';
  } catch {
    isAdmin = false;
  }

  if (!isAdmin) redirect('/');
  return children;
}
