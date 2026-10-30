import { compare, hash } from 'bcryptjs';
import type { RowDataPacket } from 'mysql2/promise';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthDb } from '@/lib/auth/db';
import {
  AuthInputError,
  clearFailedLogins,
  createSessionToken,
  insertSession,
  isJsonRequest,
  isLoginThrottled,
  isSameOriginRequest,
  normalizeIdentifier,
  passwordValidationError,
  recordFailedLogin,
  setSessionCookie,
} from '@/lib/auth/core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const dummyHashPromise = hash('not-a-real-azlottery-account-password', 12);

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'ဤလုပ်ဆောင်မှုကို AzLottery ဆိုက်မှသာ ပို့နိုင်ပါသည်။' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }
  if (!isJsonRequest(request)) {
    return NextResponse.json({ error: 'JSON တောင်းဆိုချက်ဖြင့် ပြန်ကြိုးစားပါ။' }, { status: 415, headers: { 'Cache-Control': 'no-store' } });
  }

  let body: Record<string, unknown>;
  try {
    const length = Number(request.headers.get('content-length') || 0);
    if (length > 4096) return NextResponse.json({ error: 'တောင်းဆိုချက် အရွယ်အစားကြီးလွန်းပါသည်။' }, { status: 413 });
    body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid JSON body');
  } catch {
    return NextResponse.json({ error: 'အချက်အလက်များကို ပြန်လည်စစ်ဆေးပါ။' }, { status: 400 });
  }

  let identifier;
  try {
    identifier = normalizeIdentifier(body.identifier);
  } catch (error) {
    if (error instanceof AuthInputError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: 'ဖုန်းနံပါတ် သို့မဟုတ် အီးမေးလ်ကို မှန်ကန်စွာ ဖြည့်ပါ။' }, { status: 400 });
  }

  const passwordError = passwordValidationError(body.password);
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });
  const password = body.password as string;

  try {
    const throttled = await isLoginThrottled(identifier.value);
    const [rows] = await getAuthDb().execute<RowDataPacket[]>(
      `SELECT id, identifier, identifier_type, password_hash, status
         FROM azlottery_users WHERE identifier = ? LIMIT 1`,
      [identifier.value],
    );
    const user = rows[0];
    const storedHash = user?.password_hash ? String(user.password_hash) : await dummyHashPromise;
    const passwordMatches = await compare(password, storedHash);

    // A correct password must remain usable even if earlier failed attempts triggered the throttle.
    if (!user || !passwordMatches || user.status !== 'active') {
      if (throttled) {
        return NextResponse.json(
          { error: 'ဝင်ရောက်ရန် အကြိမ်များလွန်းပါသည်။ ၁၅ မိနစ်အကြာ ပြန်ကြိုးစားပါ။' },
          { status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': '900' } },
        );
      }
      await recordFailedLogin(identifier.value);
      return NextResponse.json(
        { error: 'ဖုန်းနံပါတ်/အီးမေးလ် သို့မဟုတ် စကားဝှက် မမှန်ကန်ပါ။' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    await clearFailedLogins(identifier.value);
    const token = createSessionToken();
    const connection = await getAuthDb().getConnection();
    try {
      await insertSession(connection, user.id as string | number | bigint, token);
    } finally {
      connection.release();
    }

    const response = NextResponse.json({
      user: { id: String(user.id), identifier: String(user.identifier), identifierType: String(user.identifier_type) },
    }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    setSessionCookie(response, token, request);
    return response;
  } catch (error) {
    console.error('[auth/login] database operation failed', (error as { code?: string }).code || 'unknown');
    return NextResponse.json({ error: 'အကောင့်ဝင်၍ မရသေးပါ။ ခဏအကြာ ပြန်ကြိုးစားပါ။' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
