import { createHash } from 'node:crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { AuthenticatedUser } from '@/lib/auth/core';

export const GAME_CODES = ['k3', '5d', 'trx'] as const;
export type GameCode = typeof GAME_CODES[number];
export const GAME_INTERVALS = [1, 3, 5, 10] as const;
export type GameInterval = typeof GAME_INTERVALS[number];
export const GAME_SELECTIONS: Record<GameCode, readonly string[]> = {
  k3: ['Big', 'Small', 'Odd', 'Even'],
  '5d': ['Big', 'Small', 'Odd', 'Even'],
  trx: ['Green', 'Red', 'Big', 'Small'],
};

export function isGameCode(value: unknown): value is GameCode {
  return typeof value === 'string' && (GAME_CODES as readonly string[]).includes(value);
}
export function isGameInterval(value: unknown): value is GameInterval {
  return Number.isInteger(value) && (GAME_INTERVALS as readonly number[]).includes(value as number);
}
export function isGameSelection(game: GameCode, value: unknown): value is string {
  return typeof value === 'string' && GAME_SELECTIONS[game].includes(value);
}

export function periodFor(game: GameCode, interval: GameInterval, now = new Date()) {
  const durationSeconds = interval * 60;
  const epoch = Math.floor(now.getTime() / 1000);
  const slot = Math.floor(epoch / durationSeconds);
  const start = slot * durationSeconds;
  const end = start + durationSeconds;
  const startDate = new Date(start * 1000);
  const dayStart = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()) / 1000;
  const daySlot = Math.floor((start - dayStart) / durationSeconds) + 1;
  const periodId = `${startDate.getUTCFullYear()}${String(startDate.getUTCMonth() + 1).padStart(2, '0')}${String(startDate.getUTCDate()).padStart(2, '0')}${String(interval).padStart(2, '0')}${String(daySlot).padStart(5, '0')}`;
  return { game, interval, periodId, startsAt: new Date(start * 1000), endsAt: new Date(end * 1000), secondsLeft: Math.max(0, end - epoch) };
}

function seedFor(game: GameCode, periodId: string) {
  return createHash('sha256').update(`${game}:${periodId}`).digest('hex');
}
export function resultFor(game: GameCode, periodId: string): string {
  const seed = seedFor(game, periodId);
  if (game === 'k3') {
    return [0, 1, 2].map((offset) => (parseInt(seed.slice(offset * 2, offset * 2 + 2), 16) % 6) + 1).join('');
  }
  return Array.from({ length: 5 }, (_, index) => parseInt(seed.slice(index * 2, index * 2 + 2), 16) % 10).join('');
}

export function selectionWins(game: GameCode, selection: string, result: string) {
  if (game === 'k3') {
    const total = result.split('').reduce((sum, digit) => sum + Number(digit), 0);
    if (selection === 'Big') return total >= 11;
    if (selection === 'Small') return total <= 10;
    if (selection === 'Odd') return total % 2 === 1;
    if (selection === 'Even') return total % 2 === 0;
  }
  const number = Number(result);
  if (selection === 'Big') return number >= (game === '5d' ? 50000 : 50000);
  if (selection === 'Small') return number < (game === '5d' ? 50000 : 50000);
  if (game === 'trx' && selection === 'Green') return number % 2 === 1;
  if (game === 'trx' && selection === 'Red') return number % 2 === 0;
  if (selection === 'Odd') return number % 2 === 1;
  if (selection === 'Even') return number % 2 === 0;
  return false;
}

export function payoutFor(stake: number, won: boolean) {
  return won ? stake * 2 : 0;
}

export async function ensureWallet(connection: PoolConnection, userId: string) {
  await connection.execute('INSERT IGNORE INTO azlottery_wallets (user_id, balance_mmk) VALUES (?, 0)', [userId]);
}

export async function getUserId(user: AuthenticatedUser | null) {
  if (!user) throw new Error('AUTH_REQUIRED');
  return user.id;
}

export async function settleRoundBets(connection: PoolConnection, roundId: number, result: string, settledAt: Date) {
  const [bets] = await connection.execute<RowDataPacket[]>(
    `SELECT id, user_id, stake_mmk, selection FROM azlottery_game_bets WHERE round_id = ? AND status = 'pending' FOR UPDATE`,
    [roundId],
  );
  for (const bet of bets) {
    const [roundRows] = await connection.execute<RowDataPacket[]>(
      'SELECT game_code FROM azlottery_game_rounds WHERE id = ? LIMIT 1', [roundId],
    );
    const game = roundRows[0]?.game_code as GameCode;
    const won = selectionWins(game, String(bet.selection), result);
    const payout = payoutFor(Number(bet.stake_mmk), won);
    await connection.execute(
      `UPDATE azlottery_game_bets SET status = ?, payout_mmk = ?, settled_at = ? WHERE id = ?`,
      [won ? 'won' : 'lost', payout, settledAt, bet.id],
    );
    if (payout > 0) {
      await ensureWallet(connection, String(bet.user_id));
      const [walletRows] = await connection.execute<RowDataPacket[]>(
        'SELECT balance_mmk FROM azlottery_wallets WHERE user_id = ? FOR UPDATE', [bet.user_id],
      );
      const balance = Number(walletRows[0]?.balance_mmk || 0) + payout;
      await connection.execute('UPDATE azlottery_wallets SET balance_mmk = ? WHERE user_id = ?', [balance, bet.user_id]);
      await connection.execute(
        `INSERT INTO azlottery_wallet_ledger (user_id, bet_id, kind, amount_mmk, balance_after_mmk, reference_key)
         VALUES (?, ?, 'game_payout', ?, ?, ?)`,
        [bet.user_id, bet.id, payout, balance, `payout:${bet.id}`],
      );
    }
  }
}
