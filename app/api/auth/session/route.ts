import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, sessionTokenFromRequest } from '@/lib/auth/core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(sessionTokenFromRequest(request));
    return NextResponse.json({ user }, { headers: { 'Cache-Control': 'no-store, private' } });
  } catch (error) {
    console.error('[auth/session] database operation failed', (error as { code?: string }).code || 'unknown');
    return NextResponse.json({ error: 'အကောင့်အခြေအနေကို စစ်ဆေး၍မရပါ။' }, { status: 503, headers: { 'Cache-Control': 'no-store, private' } });
  }
}
