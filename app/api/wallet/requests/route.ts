import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getAuthDb } from '@/lib/auth/db';
import { getSessionUser, isJsonRequest, isSameOriginRequest, sessionTokenFromRequest } from '@/lib/auth/core';
import { ensureWalletRow, numberFromDb } from '@/lib/wallet/server';
import { normalizePhone, normalizeTransferId, parseMmkAmount } from '@/lib/wallet/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'ဤလုပ်ဆောင်မှုကို AzLottery ဆိုက်မှသာ ပို့နိုင်ပါသည်။' }, { status: 403 });
  if (!isJsonRequest(request)) return NextResponse.json({ error: 'JSON တောင်းဆိုချက်ဖြင့် ပြန်ကြိုးစားပါ။' }, { status: 415 });
  const user = await getSessionUser(sessionTokenFromRequest(request));
  if (!user) return NextResponse.json({ error: 'အကောင့်ဝင်ရောက်ရန် လိုအပ်ပါသည်။' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('တောင်းဆိုချက် မမှန်ကန်ပါ။');
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'တောင်းဆိုချက် မမှန်ကန်ပါ။' }, { status: 400 });
  }

  const kind = body.kind;
  if (kind !== 'deposit' && kind !== 'withdrawal') return NextResponse.json({ error: 'ငွေလွှဲအမျိုးအစား မမှန်ကန်ပါ။' }, { status: 400 });
  let phone: string;
  try { phone = normalizePhone(body.phone); }
  catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }

  const connection = await getAuthDb().getConnection();
  try {
    if (kind === 'deposit') {
      let transferId: string;
      try { transferId = normalizeTransferId(body.transferId); }
      catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
      try {
        const [result] = await connection.execute(
          `INSERT INTO azlottery_payment_requests (user_id, kind, status, phone, transfer_id, amount_mmk)
           VALUES (?, 'deposit', 'pending', ?, ?, NULL)`,
          [user.id, phone, transferId],
        );
        return NextResponse.json({
          ok: true,
          request: { id: String((result as { insertId: number | bigint }).insertId), kind: 'deposit', status: 'pending', amount: null, phone, transfer_id: transferId },
          message: 'ငွေသွင်းတောင်းဆိုမှုကို စစ်ဆေးရန်ပေးပို့ပြီးပါပြီ။ အတည်ပြုပြီးမှသာ balance တိုးပါမည်။',
        }, { status: 201, headers: { 'Cache-Control': 'no-store, private' } });
      } catch (error) {
        if ((error as { code?: string }).code === 'ER_DUP_ENTRY') {
          return NextResponse.json({ error: 'ဤငွေလွှဲ ID ကို တင်သွင်းပြီးဖြစ်ပါသည်။' }, { status: 409 });
        }
        throw error;
      }
    }

    let amount: number;
    try { amount = parseMmkAmount(body.amount); }
    catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }

    await connection.beginTransaction();
    await ensureWalletRow(connection, user.id);
    const [walletRows] = await connection.execute<RowDataPacket[]>(
      'SELECT balance_mmk FROM azlottery_wallets WHERE user_id = ? FOR UPDATE', [user.id],
    );
    const [reservedRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COALESCE(SUM(amount_mmk), 0) AS reserved_mmk FROM azlottery_payment_requests
        WHERE user_id = ? AND kind = 'withdrawal' AND status = 'pending'`, [user.id],
    );
    const wallet = walletRows[0];
    const balance = numberFromDb(wallet?.balance_mmk);
    const reserved = numberFromDb(reservedRows[0]?.reserved_mmk);
    if (balance - reserved < amount) {
      await connection.rollback();
      return NextResponse.json({ error: 'ထုတ်ယူရန် ရရှိနိုင်သော MMK လက်ကျန် မလုံလောက်ပါ။' }, { status: 409 });
    }
    const [insertResult] = await connection.execute(
      `INSERT INTO azlottery_payment_requests (user_id, kind, status, phone, transfer_id, amount_mmk)
       VALUES (?, 'withdrawal', 'pending', ?, NULL, ?)`,
      [user.id, phone, amount],
    );
    await connection.commit();
    return NextResponse.json({
      ok: true,
      request: { id: String((insertResult as { insertId: number | bigint }).insertId), kind: 'withdrawal', status: 'pending', amount, phone },
      message: 'ငွေထုတ်တောင်းဆိုမှုကို စာရင်းသွင်းပြီးပါပြီ။ စစ်ဆေးနေစဉ် ထိုပမာဏကို ယာယီ reserve လုပ်ထားပါသည်။',
    }, { status: 201, headers: { 'Cache-Control': 'no-store, private' } });
  } catch (error) {
    await connection.rollback();
    console.error('[wallet/requests] failed', (error as { code?: string }).code || 'unknown');
    return NextResponse.json({ error: 'ငွေလွှဲတောင်းဆိုမှုကို သိမ်းဆည်း၍မရပါ။' }, { status: 503 });
  } finally {
    connection.release();
  }
}
