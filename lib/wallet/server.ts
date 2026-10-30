import type { PoolConnection, RowDataPacket } from 'mysql2/promise';

export async function ensureWalletRow(connection: PoolConnection, userId: string): Promise<void> {
  await connection.execute(
    'INSERT IGNORE INTO azlottery_wallets (user_id, balance_mmk) VALUES (?, 0)',
    [userId],
  );
}

export function numberFromDb(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const result = typeof value === 'bigint' ? Number(value) : Number(value ?? 0);
  if (!Number.isSafeInteger(result)) throw new RangeError('Wallet amount exceeds safe integer precision.');
  return result;
}

export function dateToIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== 'string' || !value) return '';
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

export function ledgerDescription(row: RowDataPacket): string {
  const kind = String(row.kind);
  const reference = String(row.reference_key || '');
  if (kind === 'deposit') return `Admin အတည်ပြု ငွေသွင်း${reference ? ` · ${reference}` : ''}`;
  if (kind === 'withdrawal') return `Admin အတည်ပြု ငွေထုတ်${reference ? ` · ${reference}` : ''}`;
  if (kind === 'game_stake') return `ဂိမ်းလောင်းကြေး${reference ? ` · ${reference}` : ''}`;
  if (kind === 'game_payout') return `ဂိမ်းဆုငွေ${reference ? ` · ${reference}` : ''}`;
  if (reference.startsWith('withdrawal-reserve-release:')) return `ငြင်းပယ်ထားသော ငွေထုတ် reserve ပြန်လွှတ် · #${reference.split(':').at(-1)}`;
  return `လက်ကျန်စာရင်းပြင်ဆင်မှု${reference ? ` · ${reference}` : ''}`;
}
