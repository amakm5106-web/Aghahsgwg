import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getAuthDb } from '@/lib/auth/db';
import { getAdminSessionUser } from '@/lib/auth/admin-server';
import { dateToIso, ledgerDescription, numberFromDb } from '@/lib/wallet/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminSessionUser(request);
    if (!admin) return NextResponse.json({ error: 'စီမံခန့်ခွဲသူခွင့်ပြုချက် မရှိပါ။' }, { status: 403 });
    const db = getAuthDb();
    const [statsRows, requestsRows, usersRows, ledgerRows, providersRows] = await Promise.all([
      db.execute<RowDataPacket[]>(
        `SELECT
           (SELECT COUNT(*) FROM azlottery_users WHERE status = 'active') AS total_users,
           (SELECT COUNT(*) FROM azlottery_payment_requests WHERE status = 'pending' AND kind = 'deposit') AS pending_deposits,
           (SELECT COUNT(*) FROM azlottery_payment_requests WHERE status = 'pending' AND kind = 'withdrawal') AS pending_withdrawals,
           (SELECT COALESCE(SUM(amount_mmk), 0) FROM azlottery_payment_requests WHERE status = 'approved' AND kind = 'deposit') AS approved_deposits_mmk,
           (SELECT COALESCE(SUM(amount_mmk), 0) FROM azlottery_payment_requests WHERE status = 'approved' AND kind = 'withdrawal') AS approved_withdrawals_mmk,
           (SELECT COALESCE(SUM(balance_mmk), 0) FROM azlottery_wallets) AS wallet_total_mmk,
           (SELECT COALESCE(SUM(amount_mmk), 0) FROM azlottery_payment_requests WHERE status = 'pending' AND kind = 'withdrawal') AS wallet_reserved_mmk,
           (SELECT COALESCE(SUM(balance_mmk), 0) FROM azlottery_wallets) -
           (SELECT COALESCE(SUM(amount_mmk), 0) FROM azlottery_payment_requests WHERE status = 'pending' AND kind = 'withdrawal') AS wallet_available_mmk`,
      ),
      db.execute<RowDataPacket[]>(
        `SELECT r.id, r.user_id, u.identifier AS user_identifier, r.kind, r.status, r.phone,
                r.transfer_id, r.amount_mmk, r.provider_code, r.payout_reference, r.admin_note, r.created_at
           FROM azlottery_payment_requests r JOIN azlottery_users u ON u.id = r.user_id
          ORDER BY (r.status = 'pending') DESC, r.created_at DESC, r.id DESC LIMIT 300`,
      ),
      db.execute<RowDataPacket[]>(
        `SELECT u.id, u.identifier, u.identifier_type, u.status, u.created_at,
                COALESCE(w.balance_mmk, 0) AS balance_mmk,
                COALESCE((SELECT SUM(r.amount_mmk) FROM azlottery_payment_requests r
                           WHERE r.user_id = u.id AND r.kind = 'withdrawal' AND r.status = 'pending'), 0) AS reserved_mmk
           FROM azlottery_users u LEFT JOIN azlottery_wallets w ON w.user_id = u.id
          ORDER BY u.created_at DESC, u.id DESC LIMIT 200`,
      ),
      db.execute<RowDataPacket[]>(
        `SELECT l.id, l.user_id, u.identifier AS user_identifier, l.kind, l.amount_mmk,
                l.balance_after_mmk, l.reference_key, l.created_at
           FROM azlottery_wallet_ledger l JOIN azlottery_users u ON u.id = l.user_id
          ORDER BY l.created_at DESC, l.id DESC LIMIT 100`,
      ),
      db.execute<RowDataPacket[]>(
        `SELECT code, name, receiver_phone, receiver_name, status
           FROM azlottery_payment_providers ORDER BY name ASC`,
      ),
    ]);
    const stats = statsRows[0][0] || {};
    return NextResponse.json({
      stats: {
        totalUsers: numberFromDb(stats.total_users),
        pendingDeposits: numberFromDb(stats.pending_deposits),
        pendingWithdrawals: numberFromDb(stats.pending_withdrawals),
        approvedDeposits: numberFromDb(stats.approved_deposits_mmk),
        approvedWithdrawals: numberFromDb(stats.approved_withdrawals_mmk),
        walletTotal: numberFromDb(stats.wallet_total_mmk),
        walletReserved: numberFromDb(stats.wallet_reserved_mmk),
        walletAvailable: Math.max(0, numberFromDb(stats.wallet_available_mmk)),
      },
      requests: requestsRows[0].map((row) => ({
        id: String(row.id), user_id: String(row.user_id), user_identifier: String(row.user_identifier),
        kind: String(row.kind), status: String(row.status), phone: String(row.phone),
        account_number: String(row.phone), account_name: '',
        payment_method: row.provider_code ? String(row.provider_code).toUpperCase() : 'စီမံခန့်ခွဲသူ စစ်ဆေးမည်',
        transfer_id: row.transfer_id ? String(row.transfer_id) : null,
        txn_id: row.transfer_id ? String(row.transfer_id) : row.payout_reference ? String(row.payout_reference) : null,
        amount: row.amount_mmk === null ? null : numberFromDb(row.amount_mmk),
        provider_code: row.provider_code ? String(row.provider_code) : null,
        payout_reference: row.payout_reference ? String(row.payout_reference) : null,
        admin_note: row.admin_note ? String(row.admin_note) : null,
        created_at: dateToIso(row.created_at),
      })),
      users: usersRows[0].map((row) => ({
        id: String(row.id), identifier: String(row.identifier), identifier_type: String(row.identifier_type),
        status: String(row.status), created_at: dateToIso(row.created_at),
        balance: numberFromDb(row.balance_mmk), reserved: numberFromDb(row.reserved_mmk),
        available: Math.max(0, numberFromDb(row.balance_mmk) - numberFromDb(row.reserved_mmk)),
      })),
      transactions: ledgerRows[0].map((row) => ({
        id: String(row.id), user_id: String(row.user_id), user_identifier: String(row.user_identifier),
        kind: String(row.kind), amount: numberFromDb(row.amount_mmk),
        balance_after: numberFromDb(row.balance_after_mmk), description: ledgerDescription(row),
        created_at: dateToIso(row.created_at), reference_key: String(row.reference_key),
      })),
      providers: providersRows[0].map((row) => ({
        code: String(row.code), name: String(row.name), receiver_phone: String(row.receiver_phone),
        receiver_name: String(row.receiver_name), status: String(row.status),
      })),
    }, { headers: { 'Cache-Control': 'no-store, private' } });
  } catch (error) {
    console.error('[admin/wallet] failed', (error as { code?: string }).code || 'unknown');
    return NextResponse.json({ error: 'ငွေကြေးစာရင်းကို ရယူ၍မရပါ။' }, { status: 503, headers: { 'Cache-Control': 'no-store, private' } });
  }
}
