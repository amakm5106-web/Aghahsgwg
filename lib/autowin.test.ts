import test from 'node:test';
import assert from 'node:assert/strict';
import {
  determineWinGoAutoWin,
  determineK3AutoWin,
  determine5DAutoWin,
  determineTRXAutoWin,
} from './autowin';

test('WinGo Auto-Win: when Big has more bets than Small, Small must win (numbers 0-4)', () => {
  const bets = [
    { pick_type: 'size' as const, pick_value: 'big', stake: 50000 },
    { pick_type: 'size' as const, pick_value: 'small', stake: 5000 },
  ];

  const result = determineWinGoAutoWin(bets, 123);
  assert.ok(result.resultNumber <= 4, `Expected small number (0-4), got ${result.resultNumber}`);
  assert.equal(result.totalWinningStake, 5000);
});

test('WinGo Auto-Win: when Red has more bets than Green, Green must win', () => {
  const bets = [
    { pick_type: 'color' as const, pick_value: 'red', stake: 30000 },
    { pick_type: 'color' as const, pick_value: 'green', stake: 4000 },
  ];

  const result = determineWinGoAutoWin(bets, 42);
  assert.ok(
    result.colors.includes('green'),
    `Expected green color, got ${result.colors.join('/')} for number ${result.resultNumber}`
  );
  assert.equal(result.totalWinningStake, 4000);
});

test('WinGo Auto-Win: single bet on a specific number causes another number with zero bets to win', () => {
  const bets = [
    { pick_type: 'number' as const, pick_value: '7', stake: 10000 },
  ];

  const result = determineWinGoAutoWin(bets, 99);
  assert.notEqual(result.resultNumber, 7, 'Number 7 should lose because it has the highest bet');
  assert.equal(result.totalWinningStake, 0, 'Zero-stake side should win');
});

test('K3 Auto-Win: when Big has 20,000 MMK and Small has 0 MMK, Small must win (sum <= 10)', () => {
  const bets = [
    { selection: 'Big', stake: 20000 },
  ];

  const result = determineK3AutoWin(bets, 7);
  assert.ok(result.sum <= 10, `Expected sum <= 10 for Small, got ${result.sum}`);
});

test('K3 Auto-Win: when Odd has 15,000 MMK and Even has 3,000 MMK, Even must win', () => {
  const bets = [
    { selection: 'Odd', stake: 15000 },
    { selection: 'Even', stake: 3000 },
  ];

  const result = determineK3AutoWin(bets, 11);
  assert.equal(result.sum % 2, 0, `Expected Even sum, got ${result.sum}`);
});

test('5D Auto-Win: when Big has 50,000 MMK and Small has 1,000 MMK, Small last digit must win (0-4)', () => {
  const bets = [
    { selection: 'Big', stake: 50000 },
    { selection: 'Small', stake: 1000 },
  ];

  const result = determine5DAutoWin(bets, 5);
  assert.ok(result.lastDigit <= 4, `Expected last digit 0-4, got ${result.lastDigit}`);
});

test('TRX Auto-Win: when Green has 10,000 MMK and Red has 0 MMK, Red must win', () => {
  const bets = [
    { selection: 'Green', stake: 10000 },
  ];

  const result = determineTRXAutoWin(bets, 2);
  const isRed = [0, 2, 4, 6, 8].includes(result.resultNum);
  assert.ok(isRed, `Expected Red result, got ${result.resultNum}`);
});
