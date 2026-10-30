import type { RowDataPacket } from 'mysql2/promise';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthDb } from '@/lib/auth/db';
import { getSessionUser, sessionTokenFromRequest } from '@/lib/auth/core';
import { createReferralProfile, maskIdentifier } from '@/lib/referrals/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const privateHeaders = { 'Cache-Control': 'no-store, private' };

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(sessionTokenFromRequest(request));
    if (!user) {
      return NextResponse.json({ error: 'Referral dashboard ကိုကြည့်ရန် အကောင့်ဝင်ပါ။' }, {
        status: 401,
        headers: privateHeaders,
      });
    }

    const connection = await getAuthDb().getConnection();
    try {
      const [profileRows] = await connection.execute<RowDataPacket[]>(
        'SELECT referral_code FROM azlottery_referral_profiles WHERE user_id = ? LIMIT 1',
        [user.id],
      );
      const referralCode = profileRows[0]?.referral_code
        ? String(profileRows[0].referral_code)
        : await createReferralProfile(connection, user.id);

      const [countRows] = await connection.execute<RowDataPacket[]>(
        `WITH RECURSIVE referral_team (user_id, tier) AS (
           SELECT user_id, 1
             FROM azlottery_referral_profiles
            WHERE referred_by_user_id = ?
           UNION ALL
           SELECT child.user_id, team.tier + 1
             FROM azlottery_referral_profiles child
             JOIN referral_team team ON child.referred_by_user_id = team.user_id
            WHERE team.tier < 6
         )
         SELECT tier, COUNT(*) AS member_count
           FROM referral_team
          GROUP BY tier
          ORDER BY tier`,
        [user.id],
      );

      const [memberRows] = await connection.execute<RowDataPacket[]>(
        `WITH RECURSIVE referral_team (user_id, tier) AS (
           SELECT user_id, 1
             FROM azlottery_referral_profiles
            WHERE referred_by_user_id = ?
           UNION ALL
           SELECT child.user_id, team.tier + 1
             FROM azlottery_referral_profiles child
             JOIN referral_team team ON child.referred_by_user_id = team.user_id
            WHERE team.tier < 6
         )
         SELECT u.identifier, u.identifier_type, u.created_at, team.tier
           FROM referral_team team
           JOIN azlottery_users u ON u.id = team.user_id
          WHERE u.status = 'active'
          ORDER BY team.tier ASC, u.created_at DESC
          LIMIT 250`,
        [user.id],
      );

      const [activityRows] = await connection.execute<RowDataPacket[]>(
        `SELECT activity.activity_type, activity.tier, activity.commission_mmk,
                activity.created_at, member.identifier, member.identifier_type
           FROM azlottery_referral_activities activity
           JOIN azlottery_users member ON member.id = activity.referred_user_id
          WHERE activity.referrer_user_id = ?
          ORDER BY activity.created_at DESC, activity.id DESC
          LIMIT 50`,
        [user.id],
      );

      const [commissionRows] = await connection.execute<RowDataPacket[]>(
        `SELECT COALESCE(SUM(commission_mmk), 0) AS total_mmk,
                COALESCE(SUM(CASE
                  WHEN YEARWEEK(created_at, 3) = YEARWEEK(UTC_TIMESTAMP(), 3)
                  THEN commission_mmk ELSE 0 END), 0) AS week_mmk
           FROM azlottery_referral_activities
          WHERE referrer_user_id = ?`,
        [user.id],
      );

      const countsByTier = Array.from({ length: 6 }, (_, index) => {
        const row = countRows.find((item) => Number(item.tier) === index + 1);
        return { tier: index + 1, count: Number(row?.member_count ?? 0) };
      });
      const teamCount = countsByTier.reduce((total, item) => total + item.count, 0);

      return NextResponse.json({
        referralCode,
        directCount: countsByTier[0]?.count ?? 0,
        teamCount,
        countsByTier,
        weekCommissionMmk: Number(commissionRows[0]?.week_mmk ?? 0),
        totalCommissionMmk: Number(commissionRows[0]?.total_mmk ?? 0),
        membersTruncated: teamCount > memberRows.length,
        members: memberRows.map((member) => ({
          tier: Number(member.tier),
          identifier: maskIdentifier(String(member.identifier), member.identifier_type === 'email' ? 'email' : 'phone'),
          joinedAt: member.created_at,
        })),
        activities: activityRows.map((activity) => ({
          type: String(activity.activity_type),
          tier: Number(activity.tier),
          member: maskIdentifier(String(activity.identifier), activity.identifier_type === 'email' ? 'email' : 'phone'),
          commissionMmk: Number(activity.commission_mmk ?? 0),
          createdAt: activity.created_at,
        })),
      }, { headers: privateHeaders });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('[agent/referral] database operation failed', (error as { code?: string }).code || 'unknown');
    return NextResponse.json({ error: 'Referral အချက်အလက်ကို မရယူနိုင်ပါ။ ခဏအကြာ ပြန်ကြိုးစားပါ။' }, {
      status: 503,
      headers: privateHeaders,
    });
  }
}
