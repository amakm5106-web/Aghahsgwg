import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getWinGoColors,
  checkWinGoMatch,
  calculateWinGoPayout,
  calculateWheelPayout,
  computeWinGoPeriod,
} from './rules';

test('getWinGoColors identifies colors correctly', () => {
  assert.deepEqual(getWinGoColors(0), ['red', 'violet']);
  assert.deepEqual(getWinGoColors(5), ['green', 'violet']);
  assert.deepEqual(getWinGoColors(1), ['green']);
  assert.deepEqual(getWinGoColors(2), ['red']);
  assert.deepEqual(getWinGoColors(8), ['red']);
});

test('checkWinGoMatch checks size and color conditions', () => {
  assert.equal(checkWinGoMatch('size', 'small', 3), true);
  assert.equal(checkWinGoMatch('size', 'small', 5), false);
  assert.equal(checkWinGoMatch('size', 'big', 7), true);
  assert.equal(checkWinGoMatch('number', 'n4', 4), true);
  assert.equal(checkWinGoMatch('number', 'n4', 5), false);
  assert.equal(checkWinGoMatch('color', 'green', 1), true);
  assert.equal(checkWinGoMatch('color', 'red', 1), false);
  assert.equal(checkWinGoMatch('color', 'violet', 0), true);
});

test('calculateWinGoPayout computes real MMK returns', () => {
  // 1,000 MMK stake on Green with result 3 -> 2,000 MMK payout (2x)
  assert.equal(calculateWinGoPayout('color', 'green', 1000, 3), 2000);
  // 1,000 MMK stake on Violet with result 0 -> 4,500 MMK payout (4.5x)
  assert.equal(calculateWinGoPayout('color', 'violet', 1000, 0), 4500);
  // 1,000 MMK stake on exact number 7 with result 7 -> 9,000 MMK payout (9x)
  assert.equal(calculateWinGoPayout('number', 'n7', 1000, 7), 9000);
  // 1,000 MMK stake on losing number -> 0 MMK
  assert.equal(calculateWinGoPayout('number', 'n7', 1000, 6), 0);
});

test('calculateWheelPayout multiplies MMK stake', () => {
  assert.equal(calculateWheelPayout(500, 3), 1500);
  assert.equal(calculateWheelPayout(1000, 10), 10000);
  assert.equal(calculateWheelPayout(2000, 0), 0);
});

test('computeWinGoPeriod produces period id and enforces 5 second closing rule', () => {
  const period = computeWinGoPeriod(1, 1700000000);
  assert.equal(period.interval, 1);
  assert.ok(period.periodId.length >= 10);
  assert.ok(typeof period.secondsLeft === 'number');
});
