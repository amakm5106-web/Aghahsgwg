import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getAuthDb } from '@/lib/auth/db';
import { getAdminSessionUser } from '@/lib/auth/admin-server';
import { isJsonRequest, isSameOriginRequest } from '@/lib/auth/core';
import { ensureWalletRow, numberFromDb } from '@/lib/wallet/server';
import { normalizeTransferId, parseMmkAmount, parseProviderCode } from '@/lib/wallet/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'ဤလုပ်ဆောင်မှုကို AzLottery ဆိုက်မှသာ ပို့နိုင်ပါသည်။' }, { status: 403 });
  if (!isJsonRequest(request)) return NextResponse.json({ error: 'JSON တောင်းဆိုချက်ဖြင့် ပြန်ကြိုးစားပါ။' }, { status: 415 });
  let admin;
  try { admin = await getAdminSessionUser(request); }
  catch { return NextResponse.json({ error: 'စီမံခန့်ခွဲသူ session ကိုစစ်ဆေး၍မရပါ။' }, { status: 503 }); }
  if (!admin) return NextResponse.json({ error: 'စီမံခန့်ခွဲသူခွင့်ပြုချက် မရှိပါ။' }, { status: 403 });

  const { id } = await context.params;
  if (!/^\d{1,20}$/.test(id)) return NextResponse.json({ error: 'တောင်းဆိုမှု ID မမှန်ကန်ပါ။' }, { status: 400 });
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'တောင်းဆိုချက် မမှန်ကန်ပါ။' }, { status: 400 });
  }
  if (body.decision !== 'approve' && body.decision !== 'reject') return NextResponse.json({ error: 'လုပ်ဆောင်ချက် မမှန်ကန်ပါ။' }, { status: 400 });
  const decision = body.decision;
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : '';

  let depositAmount: number | null = null;
  let payoutReference: string | null = null;
  let providerCode: string | null = null;
  if (decision === 'approve' && body.amountMmk !== undefined) {
    try { depositAmount = parseMmkAmount(body.amountMmk); }
    catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
  }
  if (decision === 'approve' && body.payoutReference !== undefined) {
    try { payoutReference = normalizeTransferId(body.payoutReference); }
    catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
  }
  if (decision === 'approve' && body.providerCode !== undefined) {
    try { providerCode = parseProviderCode(body.providerCode); }
    catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
  }

  const connection = await getAuthDb().getConnection();
  try {
    await connection.beginTransaction();
    const [requestRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, user_id, kind, status, amount_mmk FROM azlottery_payment_requests WHERE id = ? FOR UPDATE`, [id],
    );
    const payment = requestRows[0];
    if (!payment) {
      await connection.rollback();
      return NextResponse.json({ error: 'တောင်းဆိုမှု မတွေ့ပါ။' }, { status: 404 });
    }
    if (String(payment.status) !== 'pending') {
      await connection.rollback();
      return NextResponse.json({ error: 'ဤတောင်းဆိုမှုကို စစ်ဆေးပြီးဖြစ်ပါသည်။' }, { status: 409 });
    }
    const kind = String(payment.kind);
    const userId = String(payment.user_id);
    await ensureWalletRow(connection, userId);
    const [walletRows] = await connection.execute<RowDataPacket[]>(
      'SELECT balance_mmk FROM azlottery_wallets WHERE user_id = ? FOR UPDATE', [userId],
    );
    const [reservedRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COALESCE(SUM(amount_mmk), 0) AS reserved_mmk FROM azlottery_payment_requests
        WHERE user_id = ? AND kind = 'withdrawal' AND status = 'pending'`, [userId],
    );
    const wallet = walletRows[0];
    const balance = numberFromDb(wallet?.balance_mmk);
    const reserved = numberFromDb(reservedRows[0]?.reserved_mmk);
    const storedAmount = payment.amount_mmk === null ? null : numberFromDb(payment.amount_mmk);
    const defaultNote = decision === 'approve' ? 'စီမံခန့်ခွဲသူက စစ်ဆေးအတည်ပြုပြီးပါပြီ။' : 'စီမံခန့်ခွဲသူက ပယ်ချပြီးပါပြီ။';

    if (decision === 'approve' && kind === 'deposit') {
      if (depositAmount === null) {
        await connection.rollback();
        return NextResponse.json({ error: 'ငွေလွှဲစာရင်းနှင့်စစ်ဆေးပြီး အတည်ပြုထားသော MMK ပမာဏကိုထည့်ပါ။' }, { status: 400 });
      }
      if (providerCode) {
        const [providerRows] = await connection.execute<RowDataPacket[]>(
          'SELECT code FROM azlottery_payment_providers WHERE code = ? LIMIT 1', [providerCode],
        );
        if (!providerRows[0]) {
          await connection.rollback();
          return NextResponse.json({ error: 'ရွေးထားသောငွေလက်ခံဝန်ဆောင်မှု မတွေ့ပါ။' }, { status: 400 });
        }
      }
      const updatedBalance = balance + depositAmount;
      if (!Number.isSafeInteger(updatedBalance)) {
        await connection.rollback();
        return NextResponse.json({ error: 'Wallet လက်ကျန်သည် လုံခြုံသော integer limit ကိုကျော်နေပါသည်။' }, { status: 409 });
      }
      await connection.execute('UPDATE azlottery_wallets SET balance_mmk = ? WHERE user_id = ?', [updatedBalance, userId]);
      await connection.execute(
        `INSERT INTO azlottery_wallet_ledger (user_id, kind, amount_mmk, balance_after_mmk, reference_key)
         VALUES (?, 'deposit', ?, ?, ?)`,
        [userId, depositAmount, updatedBalance, `deposit-request:${id}`],
      );
      await connection.execute(
        `UPDATE azlottery_payment_requests SET status = 'approved', amount_mmk = ?, provider_code = ?,
                admin_note = ?, reviewed_at = UTC_TIMESTAMP(), reviewed_by_user_id = ? WHERE id = ?`,
        [depositAmount, providerCode, note || defaultNote, admin.id, id],
      );
    } else if (decision === 'approve' && kind === 'withdrawal') {
      if (!storedAmount || storedAmount < 1) {
        await connection.rollback();
        return NextResponse.json({ error: 'ငွေထုတ်ပမာဏ မမှန်ကန်ပါ။' }, { status: 409 });
      }
      if (!payoutReference || !providerCode) {
        await connection.rollback();
        return NextResponse.json({ error: 'အမှန်တကယ်လွှဲပြီးသော payout reference နှင့် ငွေလွှဲဝန်ဆောင်မှုကိုထည့်ပါ။' }, { status: 400 });
      }
      const [providerRows] = await connection.execute<RowDataPacket[]>(
        `SELECT code FROM azlottery_payment_providers WHERE code = ? AND status = 'active' LIMIT 1`, [providerCode],
      );
      if (!providerRows[0]) {
        await connection.rollback();
        return NextResponse.json({ error: 'ဖွင့်ထားသော ငွေလွှဲဝန်ဆောင်မှုကိုရွေးပါ။' }, { status: 400 });
      }
      if (reserved < storedAmount || balance < storedAmount) {
        await connection.rollback();
        return NextResponse.json({ error: 'Wallet reserve စာရင်း မကိုက်ညီပါ။ ထပ်မံစစ်ဆေးပါ။' }, { status: 409 });
      }
      const updatedBalance = balance - storedAmount;
      await connection.execute('UPDATE azlottery_wallets SET balance_mmk = ? WHERE user_id = ?', [updatedBalance, userId]);
      await connection.execute(
        `INSERT INTO azlottery_wallet_ledger (user_id, kind, amount_mmk, balance_after_mmk, reference_key)
         VALUES (?, 'withdrawal', ?, ?, ?)`,
        [userId, -storedAmount, updatedBalance, `withdrawal-request:${id}`],
      );
      await connection.execute(
        `UPDATE azlottery_payment_requests SET status = 'approved', provider_code = ?, payout_reference = ?,
                admin_note = ?, reviewed_at = UTC_TIMESTAMP(), reviewed_by_user_id = ? WHERE id = ?`,
        [providerCode, payoutReference, note || defaultNote, admin.id, id],
      );
    } else if (decision === 'reject') {
      if (kind === 'withdrawal') {
        if (!storedAmount || reserved < storedAmount) {
          await connection.rollback();
          return NextResponse.json({ error: 'Reserve စာရင်းကို ပြန်စစ်ရန်လိုအပ်ပါသည်။' }, { status: 409 });
        }
      }
      await connection.execute(
        `UPDATE azlottery_payment_requests SET status = 'rejected', admin_note = ?,
                reviewed_at = UTC_TIMESTAMP(), reviewed_by_user_id = ? WHERE id = ?`,
        [note || defaultNote, admin.id, id],
      );
      if (kind === 'withdrawal') {
        await connection.execute(
          `INSERT INTO azlottery_wallet_ledger (user_id, kind, amount_mmk, balance_after_mmk, reference_key)
           VALUES (?, 'adjustment', 0, ?, ?)`,
          [userId, balance, `withdrawal-reserve-release:${id}`],
        );
      }
    } else {
      await connection.rollback();
      return NextResponse.json({ error: 'Request type မမှန်ကန်ပါ။' }, { status: 409 });
    }

    await connection.commit();
    return NextResponse.json({ ok: true, message: decision === 'approve' ? 'တောင်းဆိုမှုကို အတည်ပြုပြီးစာရင်းသွင်းလိုက်ပါပြီ။' : 'တောင်းဆိုမှုကို ပယ်ချပြီး reserve ကိုပြန်လွှတ်လိုက်ပါပြီ။' }, { headers: { 'Cache-Control': 'no-store, private' } });
  } catch (error) {
    await connection.rollback();
    if ((error as { code?: string }).code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'ဤ payout reference ကို အသုံးပြုပြီးဖြစ်ပါသည်။' }, { status: 409 });
    }
    console.error('[admin/wallet/review] failed', (error as { code?: string }).code || 'unknown');
    return NextResponse.json({ error: 'တောင်းဆိုမှုကို စာရင်းသွင်း၍မရပါ။' }, { status: 503 });
  } finally {
    connection.release();
  }
}
