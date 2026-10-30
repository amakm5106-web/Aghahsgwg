/**
 * Auto-Win Algorithm: The side with fewer/lesser bets automatically wins.
 * (လောင်းတာနည်းသောဘက် အလိုအလျောက် အနိုင်ပေးသည့် စနစ်)
 */

import { getWinGoColors, calculateWinGoPayout } from './rules';

export interface WinGoBetInput {
  pick_type: 'color' | 'size' | 'number';
  pick_value: string;
  stake: number;
}

export interface WinGoAutoWinResult {
  resultNumber: number;
  colors: ('green' | 'red' | 'violet')[];
  totalPayout: number;
  totalWinningStake: number;
  payoutByNumber: Record<number, number>;
  stakeByNumber: Record<number, number>;
  winningPoolDescription: string;
}

/**
 * Calculates for each candidate number 0..9 how much total stake and payout
 * would win, and selects the number that represents the side with the LEAST bets.
 */
export function determineWinGoAutoWin(
  bets: WinGoBetInput[],
  fallbackSeed?: number
): WinGoAutoWinResult {
  const payoutByNumber: Record<number, number> = {};
  const stakeByNumber: Record<number, number> = {};

  for (let n = 0; n <= 9; n++) {
    payoutByNumber[n] = 0;
    stakeByNumber[n] = 0;
  }

  for (const bet of bets) {
    for (let n = 0; n <= 9; n++) {
      let isWin = false;
      if (bet.pick_type === 'number') {
        const val = Number.parseInt(String(bet.pick_value).replace(/^n/, ''), 10);
        isWin = val === n;
      } else if (bet.pick_type === 'size') {
        const lower = String(bet.pick_value).toLowerCase();
        isWin = (lower === 'small' && n <= 4) || (lower === 'big' && n >= 5);
      } else if (bet.pick_type === 'color') {
        const colors = getWinGoColors(n);
        isWin = colors.includes(String(bet.pick_value).toLowerCase() as any);
      }

      if (isWin) {
        stakeByNumber[n] += bet.stake;
        payoutByNumber[n] += calculateWinGoPayout(bet.pick_type, bet.pick_value, bet.stake, n);
      }
    }
  }

  // Find candidate numbers with minimum winning stake (lowest bet pool)
  let minStake = Infinity;
  for (let n = 0; n <= 9; n++) {
    if (stakeByNumber[n] < minStake) {
      minStake = stakeByNumber[n];
    }
  }

  // From the min-stake candidates, find the ones with lowest payout
  const minStakeCandidates = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(
    (n) => stakeByNumber[n] === minStake
  );

  let minPayout = Infinity;
  for (const n of minStakeCandidates) {
    if (payoutByNumber[n] < minPayout) {
      minPayout = payoutByNumber[n];
    }
  }

  const bestCandidates = minStakeCandidates.filter((n) => payoutByNumber[n] === minPayout);

  // Pick deterministic or random among ties
  let chosenIndex = 0;
  if (fallbackSeed !== undefined && fallbackSeed !== null) {
    chosenIndex = Math.abs(fallbackSeed) % bestCandidates.length;
  } else {
    chosenIndex = Math.floor(Math.random() * bestCandidates.length);
  }
  const resultNumber = bestCandidates[chosenIndex];
  const colors = getWinGoColors(resultNumber);

  const winningSide = resultNumber >= 5 ? 'Big (ကြီး)' : 'Small (သေး)';
  const colorStr = colors.join('/');

  return {
    resultNumber,
    colors,
    totalPayout: payoutByNumber[resultNumber],
    totalWinningStake: stakeByNumber[resultNumber],
    payoutByNumber,
    stakeByNumber,
    winningPoolDescription: `ဂဏန်း ${resultNumber} (${winningSide} · ${colorStr})`,
  };
}

/**
 * K3 Auto-Win: Picks 3 dice whose sum satisfies the least-bet options.
 */
export function determineK3AutoWin(
  bets: { selection: string; stake: number }[],
  fallbackSeed?: number
): { dice: [number, number, number]; sum: number; summary: string } {
  let bigStake = 0;
  let smallStake = 0;
  let oddStake = 0;
  let evenStake = 0;

  for (const bet of bets) {
    const sel = bet.selection.toLowerCase();
    if (sel === 'big') bigStake += bet.stake;
    else if (sel === 'small') smallStake += bet.stake;
    else if (sel === 'odd') oddStake += bet.stake;
    else if (sel === 'even') evenStake += bet.stake;
  }

  // Desired size: side with less bet
  const wantBig = bigStake < smallStake ? true : smallStake < bigStake ? false : (fallbackSeed ? fallbackSeed % 2 === 1 : Math.random() > 0.5);
  // Desired parity: side with less bet
  const wantOdd = oddStake < evenStake ? true : evenStake < oddStake ? false : (fallbackSeed ? Math.floor(fallbackSeed / 2) % 2 === 1 : Math.random() > 0.5);

  // All 216 dice combinations (1..6)
  const matchingRolls: [number, number, number][] = [];
  for (let d1 = 1; d1 <= 6; d1++) {
    for (let d2 = 1; d2 <= 6; d2++) {
      for (let d3 = 1; d3 <= 6; d3++) {
        const sum = d1 + d2 + d3;
        const isBig = sum >= 11;
        const isOdd = sum % 2 === 1;
        if (isBig === wantBig && isOdd === wantOdd) {
          matchingRolls.push([d1, d2, d3]);
        }
      }
    }
  }

  const rollIndex = (fallbackSeed ? Math.abs(fallbackSeed) : Math.floor(Math.random() * 1000)) % matchingRolls.length;
  const dice = matchingRolls[rollIndex] || [2, 2, 3];
  const sum = dice[0] + dice[1] + dice[2];

  const sizeLabel = sum >= 11 ? 'Big' : 'Small';
  const parityLabel = sum % 2 === 1 ? 'Odd' : 'Even';

  return {
    dice,
    sum,
    summary: `ပေါင်းလဒ်: ${sum} (${sizeLabel} · ${parityLabel})`,
  };
}

/**
 * 5D Auto-Win: Generates 5 digits where the last digit satisfies the least-bet side.
 */
export function determine5DAutoWin(
  bets: { selection: string; stake: number }[],
  fallbackSeed?: number
): { digits: [number, number, number, number, number]; lastDigit: number; summary: string } {
  let bigStake = 0;
  let smallStake = 0;
  let oddStake = 0;
  let evenStake = 0;

  for (const bet of bets) {
    const sel = bet.selection.toLowerCase();
    if (sel === 'big') bigStake += bet.stake;
    else if (sel === 'small') smallStake += bet.stake;
    else if (sel === 'odd') oddStake += bet.stake;
    else if (sel === 'even') evenStake += bet.stake;
  }

  const wantBig = bigStake < smallStake ? true : smallStake < bigStake ? false : (fallbackSeed ? fallbackSeed % 2 === 1 : Math.random() > 0.5);
  const wantOdd = oddStake < evenStake ? true : evenStake < oddStake ? false : (fallbackSeed ? Math.floor(fallbackSeed / 2) % 2 === 1 : Math.random() > 0.5);

  let possibleLastDigits: number[];
  if (wantBig && wantOdd) possibleLastDigits = [5, 7, 9];
  else if (wantBig && !wantOdd) possibleLastDigits = [6, 8];
  else if (!wantBig && wantOdd) possibleLastDigits = [1, 3];
  else possibleLastDigits = [0, 2, 4];

  const lastIdx = (fallbackSeed ? Math.abs(fallbackSeed) : Math.floor(Math.random() * 100)) % possibleLastDigits.length;
  const lastDigit = possibleLastDigits[lastIdx];

  const d1 = Math.floor(Math.random() * 10);
  const d2 = Math.floor(Math.random() * 10);
  const d3 = Math.floor(Math.random() * 10);
  const d4 = Math.floor(Math.random() * 10);

  const digits: [number, number, number, number, number] = [d1, d2, d3, d4, lastDigit];
  const sizeLabel = lastDigit >= 5 ? 'Big' : 'Small';
  const parityLabel = lastDigit % 2 === 1 ? 'Odd' : 'Even';

  return {
    digits,
    lastDigit,
    summary: `နောက်ဆုံးဂဏန်း: ${lastDigit} (${sizeLabel} · ${parityLabel})`,
  };
}

/**
 * TRX Auto-Win: Generates number based on TRX blockchain hash where least-bet side wins.
 */
export function determineTRXAutoWin(
  bets: { selection: string; stake: number }[],
  fallbackSeed?: number
): { resultNum: number; summary: string } {
  let greenStake = 0;
  let redStake = 0;
  let bigStake = 0;
  let smallStake = 0;

  for (const bet of bets) {
    const sel = bet.selection.toLowerCase();
    if (sel === 'green') greenStake += bet.stake;
    else if (sel === 'red') redStake += bet.stake;
    else if (sel === 'big') bigStake += bet.stake;
    else if (sel === 'small') smallStake += bet.stake;
  }

  const wantGreen = greenStake < redStake ? true : redStake < greenStake ? false : (fallbackSeed ? fallbackSeed % 2 === 1 : Math.random() > 0.5);
  const wantBig = bigStake < smallStake ? true : smallStake < bigStake ? false : (fallbackSeed ? Math.floor(fallbackSeed / 2) % 2 === 1 : Math.random() > 0.5);

  let possibleNumbers: number[];
  if (wantGreen && wantBig) possibleNumbers = [5, 7, 9];
  else if (wantGreen && !wantBig) possibleNumbers = [1, 3];
  else if (!wantGreen && wantBig) possibleNumbers = [6, 8];
  else possibleNumbers = [0, 2, 4];

  const idx = (fallbackSeed ? Math.abs(fallbackSeed) : Math.floor(Math.random() * 100)) % possibleNumbers.length;
  const resultNum = possibleNumbers[idx];

  const colorLabel = [1, 3, 7, 9].includes(resultNum) || resultNum === 5 ? 'Green' : 'Red';
  const sizeLabel = resultNum >= 5 ? 'Big' : 'Small';

  return {
    resultNum,
    summary: `ဂဏန်း ${resultNum} (${colorLabel} · ${sizeLabel})`,
  };
}
