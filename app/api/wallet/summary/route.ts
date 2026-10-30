import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getAuthDb } from '@/lib/auth/db';
import { getSessionUser, sessionTokenFromRequest } from '@/lib/auth/core';
import { dateToIso, ensureWalletRow, ledgerDescription, numberFromDb } from '@/lib/wallet/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(sessionTokenFromRequest(request));
    if (!user) return NextResponse.json({ error: 'အကောင့်ဝင်ရောက်ရန် လိုအပ်ပါသည်။' }, { status: 401 });

    const connection = await getAuthDb().getConnection();
    try {
      await connection.beginTransaction();
      await ensureWalletRow(connection, user.id);
      const [walletRows] = await connection.execute<RowDataPacket[]>(
        'SELECT balance_mmk FROM azlottery_wallets WHERE user_id = ? FOR UPDATE', [user.id],
      );
      const [reservedRows] = await connection.execute<RowDataPacket[]>(
        `SELECT COALESCE(SUM(amount_mmk), 0) AS reserved_mmk FROM azlottery_payment_requests
          WHERE user_id = ? AND kind = 'withdrawal' AND status = 'pending'`, [user.id],
      );
      const [requestRows] = await connection.execute<RowDataPacket[]>(
        `SELECT id, kind, status, phone, transfer_id, amount_mmk, provider_code, payout_reference, admin_note, created_at
           FROM azlottery_payment_requests WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 100`,
        [user.id],
      );
      const [ledgerRows] = await connection.execute<RowDataPacket[]>(
        `SELECT id, user_id, kind, amount_mmk, balance_after_mmk, reference_key, created_at
           FROM azlottery_wallet_ledger WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 200`,
        [user.id],
      );
      const [providerRows] = await connection.execute<RowDataPacket[]>(
        `SELECT code, name, receiver_phone, receiver_name, status
           FROM azlottery_payment_providers WHERE status = 'active' ORDER BY name ASC`,
      );
      await connection.commit();

      const balance = numberFromDb(walletRows[0]?.balance_mmk);
      const reserved = numberFromDb(reservedRows[0]?.reserved_mmk);
      return NextResponse.json({
        wallet: { balance, reserved, available: Math.max(0, balance - reserved) },
        requests: requestRows.map((row) => ({
          id: String(row.id), user_id: user.id, user_identifier: user.identifier,
          kind: String(row.kind), status: String(row.status), phone: String(row.phone),
          account_number: String(row.phone), transfer_id: row.transfer_id ? String(row.transfer_id) : null,
          txn_id: row.transfer_id ? String(row.transfer_id) : row.payout_reference ? String(row.payout_reference) : null,
          payout_reference: row.payout_reference ? String(row.payout_reference) : null,
          amount: row.amount_mmk === null ? null : numberFromDb(row.amount_mmk),
          provider_code: row.provider_code ? String(row.provider_code) : null,
          payment_method: row.provider_code ? String(row.provider_code).toUpperCase() : 'စီမံခန့်ခွဲသူ စစ်ဆေးမည်',
          created_at: dateToIso(row.created_at), admin_note: row.admin_note ? String(row.admin_note) : null,
        })),
        transactions: ledgerRows.map((row) => ({
          id: String(row.id), user_id: Number(row.user_id),
          kind: row.kind === 'game_stake' ? 'wingo_stake' : row.kind === 'game_payout' ? 'wingo_payout' : String(row.kind),
          amount: numberFromDb(row.amount_mmk), balance_after: numberFromDb(row.balance_after_mmk),
          description: ledgerDescription(row), created_at: dateToIso(row.created_at),
        })),
        providers: providerRows.map((row) => ({
          code: String(row.code), name: String(row.name), receiver_phone: String(row.receiver_phone),
          receiver_name: String(row.receiver_name), status: String(row.status),
        })),
      }, { headers: { 'Cache-Control': 'no-store, private' } });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('[wallet/summary] failed', (error as { code?: string }).code || 'unknown');
    return NextResponse.json({ error: 'ပိုက်ဆံအိတ်အချက်အလက်ကို ရယူ၍မရပါ။' }, { status: 503, headers: { 'Cache-Control': 'no-store, private' } });
  }
}
