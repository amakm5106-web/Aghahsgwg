import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getAuthDb } from '@/lib/auth/db';
import {
  AuthInputError,
  createSessionToken,
  hashPassword,
  insertSession,
  isJsonRequest,
  isSameOriginRequest,
  normalizeIdentifier,
  passwordValidationError,
  setSessionCookie,
} from '@/lib/auth/core';
import { createReferralProfile, recordReferralRegistration } from '@/lib/referrals/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

  const referralCode = typeof body.referralCode === 'string' ? body.referralCode.trim().toUpperCase() : '';
  if (referralCode.length > 20) {
    return NextResponse.json({ error: 'ဖိတ်ခေါ်ကုဒ်ကို မှန်ကန်စွာ ဖြည့်ပါ။' }, { status: 400 });
  }

  let passwordHash: string;
  try {
    passwordHash = await hashPassword(body.password as string);
  } catch {
    return NextResponse.json({ error: 'အကောင့်ဖွင့်ရာတွင် အမှားဖြစ်နေပါသည်။ နောက်မှ ထပ်ကြိုးစားပါ။' }, { status: 500 });
  }

  let connection;
  try {
    connection = await getAuthDb().getConnection();
  } catch (error) {
    console.error('[auth/register] connection failed', (error as { code?: string }).code || 'unknown');
    return NextResponse.json({ error: 'အကောင့်ဖွင့်၍ မရသေးပါ။ ခဏအကြာ ပြန်ကြိုးစားပါ။' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  let token = '';
  let userId = '';
  try {
    await connection.beginTransaction();
    let referrerId: string | null = null;
    if (referralCode) {
      const [referrerRows] = await connection.execute<RowDataPacket[]>(
        `SELECT profile.user_id
           FROM azlottery_referral_profiles profile
           JOIN azlottery_users u ON u.id = profile.user_id
          WHERE profile.referral_code = ? AND u.status = 'active'
          LIMIT 1`,
        [referralCode],
      );
      if (!referrerRows[0]) {
        await connection.rollback();
        return NextResponse.json({ error: 'ဖိတ်ခေါ်ကုဒ် မမှန်ကန်ပါ။ ပြန်စစ်ဆေးပါ။' }, { status: 400 });
      }
      referrerId = String(referrerRows[0].user_id);
    }

    const [result] = await connection.execute(
      'INSERT INTO azlottery_users (identifier, identifier_type, password_hash) VALUES (?, ?, ?)',
      [identifier.value, identifier.type, passwordHash],
    );
    userId = String((result as { insertId: number | bigint }).insertId);
    await createReferralProfile(connection, userId, referrerId);
    await connection.execute(
      `INSERT INTO azlottery_user_roles (user_id, role) VALUES (?, 'user')`,
      [userId],
    );
    if (referrerId) await recordReferralRegistration(connection, userId, referrerId);
    token = createSessionToken();
    await insertSession(connection, userId, token);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    const code = (error as { code?: string }).code;
    if (code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'ဤဖုန်းနံပါတ် သို့မဟုတ် အီးမေးလ်ဖြင့် အကောင့်ရှိပြီးသားပါ။ အကောင့်ဝင်ပါ။' }, { status: 409 });
    }
    console.error('[auth/register] database operation failed', code || 'unknown');
    return NextResponse.json({ error: 'အကောင့်ဖွင့်၍ မရသေးပါ။ ခဏအကြာ ပြန်ကြိုးစားပါ။' }, { status: 500 });
  } finally {
    connection.release();
  }

  const response = NextResponse.json({
    user: { id: userId, identifier: identifier.value, identifierType: identifier.type },
  }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  setSessionCookie(response, token, request);
  return response;
}
