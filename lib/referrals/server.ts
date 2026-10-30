import { randomBytes } from 'node:crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';

export function createReferralCode(): string {
  return `AZ${randomBytes(6).toString('hex').toUpperCase()}`;
}

export async function createReferralProfile(
  connection: PoolConnection,
  userId: string | number | bigint,
  referredByUserId: string | number | bigint | null = null,
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = createReferralCode();
    try {
      await connection.execute(
        `INSERT INTO azlottery_referral_profiles (user_id, referral_code, referred_by_user_id)
         VALUES (?, ?, ?)`,
        [String(userId), code, referredByUserId === null ? null : String(referredByUserId)],
      );
      return code;
    } catch (error) {
      const dbError = error as { code?: string; message?: string };
      if (dbError.code !== 'ER_DUP_ENTRY') throw error;
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT referral_code FROM azlottery_referral_profiles WHERE user_id = ? LIMIT 1',
        [String(userId)],
      );
      if (rows[0]?.referral_code) return String(rows[0].referral_code);
      if (attempt === 4) throw error;
    }
  }
  throw new Error('Unable to allocate a unique referral code');
}

export async function recordReferralRegistration(
  connection: PoolConnection,
  newUserId: string | number | bigint,
  directReferrerId: string | number | bigint,
): Promise<void> {
  let parentId: string | number | bigint | null = directReferrerId;

  for (let tier = 1; tier <= 6 && parentId !== null; tier += 1) {
    await connection.execute(
      `INSERT INTO azlottery_referral_activities
         (referrer_user_id, referred_user_id, tier, activity_type, commission_mmk)
       VALUES (?, ?, ?, 'registration', 0)`,
      [String(parentId), String(newUserId), tier],
    );

    const parentQuery = await connection.execute<RowDataPacket[]>(
      'SELECT referred_by_user_id FROM azlottery_referral_profiles WHERE user_id = ? LIMIT 1',
      [String(parentId)],
    );
    const parents: RowDataPacket[] = parentQuery[0];
    const ancestorId: unknown = parents[0]?.referred_by_user_id;
    parentId = ancestorId === null || ancestorId === undefined ? null : String(ancestorId);
  }
}

export function maskIdentifier(identifier: string, type: 'email' | 'phone'): string {
  if (type === 'email') {
    const [localPart, domain] = identifier.split('@');
    if (!domain) return '••••';
    return `${localPart.slice(0, 1)}•••@${domain}`;
  }
  const digits = identifier.replace(/\D/g, '');
  return digits.length > 4 ? `${digits.slice(0, 2)}••••${digits.slice(-2)}` : '••••';
}
