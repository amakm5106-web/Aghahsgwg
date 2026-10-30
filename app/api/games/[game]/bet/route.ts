import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, sessionTokenFromRequest } from '@/lib/auth/core';
import { getAuthDb } from '@/lib/auth/db';
import { ensureWalletRow, numberFromDb } from '@/lib/wallet/server';
import { periodFor, isGameCode, type GameCode, type GameInterval } from '@/lib/games/server';
import type { RowDataPacket } from 'mysql2/promise';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ game: string }> }
) {
  try {
    const { game } = await context.params;
    const user = await getSessionUser(sessionTokenFromRequest(request));
    if (!user) {
      return NextResponse.json({ error: 'အကောင့်ဝင်ရောက်ရန် လိုအပ်ပါသည်။' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const selection = String(body.selection || body.pick_value || '').trim();
    const stakeMMK = Math.floor(Number(body.stake || body.stakeMMK || 0));
    const intervalMins = Number(body.interval || 1) as GameInterval;

    if (stakeMMK < 100 || stakeMMK > 10_000_000) {
      return NextResponse.json({ error: 'လောင်းကြေးသည် အနည်းဆုံး ၁၀၀ MMK မှ ၁၀,၀၀၀,၀၀၀ MMK အတွင်း ဖြစ်ရပါမည်။' }, { status: 400 });
    }

    if (!selection) {
      return NextResponse.json({ error: 'လောင်းမည့် အကွက်/အရောင်/ဂဏန်း ရွေးချယ်ပါ။' }, { status: 400 });
    }

    const connection = await getAuthDb().getConnection();
    try {
      await connection.beginTransaction();
      await ensureWalletRow(connection, user.id);

      const [walletRows] = await connection.execute<RowDataPacket[]>(
        'SELECT balance_mmk FROM azlottery_wallets WHERE user_id = ? FOR UPDATE',
        [user.id]
      );
      const currentBalance = numberFromDb(walletRows[0]?.balance_mmk);

      if (currentBalance < stakeMMK) {
        await connection.rollback();
        return NextResponse.json({ error: 'လောင်းကြေးအတွက် လက်ကျန်ငွေ မလုံလောက်ပါ။' }, { status: 400 });
      }

      const period = periodFor((isGameCode(game) ? game : 'trx') as GameCode, intervalMins);
      const newBalance = currentBalance - stakeMMK;

      await connection.execute(
        'UPDATE azlottery_wallets SET balance_mmk = ? WHERE user_id = ?',
        [newBalance, user.id]
      );

      const betKey = `bet:${user.id}:${period.periodId}:${Date.now()}`;
      await connection.execute(
        `INSERT INTO azlottery_wallet_ledger (user_id, kind, amount_mmk, balance_after_mmk, reference_key)
         VALUES (?, 'game_stake', ?, ?, ?)`,
        [user.id, -stakeMMK, newBalance, betKey]
      );

      await connection.commit();

      return NextResponse.json({
        success: true,
        game,
        periodId: period.periodId,
        selection,
        stake: stakeMMK,
        newBalance,
        message: `${stakeMMK.toLocaleString()} MMK (${selection}) လောင်းကြေး အောင်မြင်ပါသည်!`,
      });
    } catch (err: any) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('[games/bet] error:', error);
    return NextResponse.json(
      { error: error?.message || 'လောင်းကြေးတင်သွင်းမှု မအောင်မြင်ပါ။' },
      { status: 500 }
    );
  }
}
