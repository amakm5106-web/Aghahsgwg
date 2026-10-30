/**
 * Core game rules, period calculation, and payout formulas for AzLottery Real MMK.
 */

export interface WinGoPeriod {
  interval: number;
  periodId: string;
  startsAt: string;
  endsAt: string;
  endEpoch: number;
  secondsLeft: number;
  bettingOpen: boolean;
}

export const WINGO_INTERVALS = [0.5, 1, 3, 5, 10] as const;
export type WinGoInterval = typeof WINGO_INTERVALS[number] | number;

export function getWinGoColors(number: number): ('green' | 'red' | 'violet')[] {
  if (number === 0) return ['red', 'violet'];
  if (number === 5) return ['green', 'violet'];
  if ([1, 3, 7, 9].includes(number)) return ['green'];
  return ['red'];
}

export function checkWinGoMatch(
  type: 'color' | 'size' | 'number',
  value: string,
  resultNumber: number
): boolean {
  if (type === 'number') {
    const num = Number.parseInt(value.replace(/^n/, ''), 10);
    return num === resultNumber;
  }
  if (type === 'size') {
    if (value === 'small') return resultNumber <= 4;
    if (value === 'big') return resultNumber >= 5;
    return false;
  }
  if (type === 'color') {
    const colors = getWinGoColors(resultNumber);
    return colors.includes(value as any);
  }
  return false;
}

export function calculateWinGoPayout(
  type: 'color' | 'size' | 'number',
  value: string,
  stakeMMK: number,
  resultNumber: number
): number {
  if (!checkWinGoMatch(type, value, resultNumber)) {
    return 0;
  }

  // Exact payout rates in MMK
  if (type === 'color') {
    if (value === 'violet') {
      return Math.floor(stakeMMK * 4.5);
    }
    // If color is red and result is 0 (red+violet), or green and result is 5 (green+violet)
    if ((value === 'red' && resultNumber === 0) || (value === 'green' && resultNumber === 5)) {
      return Math.floor(stakeMMK * 1.5);
    }
    return stakeMMK * 2;
  }

  if (type === 'number') {
    return stakeMMK * 9;
  }

  if (type === 'size') {
    return stakeMMK * 2;
  }

  return 0;
}

export function calculateWheelPayout(stakeMMK: number, multiplier: number): number {
  return Math.floor(stakeMMK * multiplier);
}

export function computeWinGoPeriod(intervalMinutes: number, nowEpochSeconds: number): WinGoPeriod {
  const duration = Math.max(10, Math.round(intervalMinutes * 60));
  const slot = Math.floor(nowEpochSeconds / duration);
  const start = slot * duration;
  const end = start + duration;
  const date = new Date(start * 1000);

  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const daySlot = Math.floor((nowEpochSeconds - Math.floor(new Date(Date.UTC(yyyy, date.getUTCMonth(), date.getUTCDate())).getTime() / 1000)) / duration);
  const intervalCode = intervalMinutes === 0.5 ? '10' : String(Math.round(intervalMinutes * 10)).padStart(2, '0');
  const periodId = `${yyyy}${mm}${dd}${intervalCode}005${String((daySlot + 1) % 10000).padStart(4, '0')}`;

  const secondsLeft = Math.max(0, end - nowEpochSeconds);
  const bettingOpen = secondsLeft > 5;

  return {
    interval: intervalMinutes,
    periodId,
    startsAt: new Date(start * 1000).toISOString(),
    endsAt: new Date(end * 1000).toISOString(),
    endEpoch: end,
    secondsLeft,
    bettingOpen,
  };
}
