import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(
    { status: 'error', message: 'အလိုအလျောက် ငွေလွှဲ provider မချိတ်ထားပါ။ Login ဝင်ပြီး wallet မှ ငွေထုတ်တောင်းဆိုပါ။' },
    { status: 410, headers: { 'Cache-Control': 'no-store' } },
  );
}
