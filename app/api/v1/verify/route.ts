import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(
    { status: 'error', message: 'Auto-verification မရှိပါ။ Login ဝင်ပြီး phone number နှင့် transfer ID ကို wallet form မှတင်ပါ။ Admin စစ်ဆေးပြီးမှ balance ပြောင်းပါမည်။' },
    { status: 410, headers: { 'Cache-Control': 'no-store' } },
  );
}
