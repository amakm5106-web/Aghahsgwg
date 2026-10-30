import { NextRequest, NextResponse } from 'next/server';
import { periodFor, isGameCode, type GameCode, type GameInterval } from '@/lib/games/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ game: string }> }
) {
  try {
    const { game } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const intervalMins = Number(searchParams.get('interval') || 1) as GameInterval;

    const gameCode: GameCode = isGameCode(game) ? game : 'trx';
    const period = periodFor(gameCode, intervalMins);

    return NextResponse.json({
      game,
      interval: intervalMins,
      periodId: period.periodId,
      startsAt: period.startsAt.toISOString(),
      endsAt: period.endsAt.toISOString(),
      secondsLeft: period.secondsLeft,
      bettingOpen: period.secondsLeft > 5,
      autoWin: {
        active: true,
      },
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'ဂိမ်းအခြေအနေ ရယူ၍မရပါ။' }, { status: 500 });
  }
}
