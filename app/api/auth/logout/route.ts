import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthDb } from '@/lib/auth/db';
import { clearSessionCookie, isSameOriginRequest, SESSION_COOKIE } from '@/lib/auth/core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'ဤလုပ်ဆောင်မှုကို AzLottery ဆိုက်မှသာ ပို့နိုင်ပါသည်။' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  try {
    if (token && token.length <= 128) {
      const tokenHash = createHash('sha256').update(token).digest('hex');
      await getAuthDb().execute('DELETE FROM azlottery_sessions WHERE token_hash = ?', [tokenHash]);
    }
    const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    clearSessionCookie(response, request);
    return response;
  } catch (error) {
    console.error('[auth/logout] database operation failed', (error as { code?: string }).code || 'unknown');
    return NextResponse.json({ error: 'ထွက်ရန် မအောင်မြင်ပါ။ နောက်မှ ပြန်ကြိုးစားပါ။' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
