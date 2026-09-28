import { describe, expect, it } from 'vitest';
import { checkDeal, dealPrice, isValidDiscount, suggestedDiscount, todayYmd, type DealProblem } from './deals';

/**
 * The same rows as backend DealPolicyTest (spec §4.5.1–4.5.2), so the dialog and the server always agree: shelf life N,
 * packed on H, pickup P, today → best-before B, days left L, problem (null = may go on a deal), suggested %.
 */
const CASES: [number, string, string, string, string, number, DealProblem | null, number][] = [
  [7, '2026-09-29', '2026-10-03', '2026-09-30', '2026-10-05', 3, null, 20],
  [21, '2026-09-14', '2026-10-03', '2026-09-30', '2026-10-04', 2, null, 40],
  [7, '2026-09-30', '2026-10-03', '2026-09-30', '2026-10-06', 4, null, 20],
  [10, '2026-09-25', '2026-10-03', '2026-09-30', '2026-10-04', 2, null, 40],
  [20, '2026-09-20', '2026-10-03', '2026-09-30', '2026-10-09', 7, null, 30],
  [20, '2026-09-21', '2026-10-03', '2026-09-30', '2026-10-10', 8, null, 20],
  [2, '2026-10-02', '2026-10-03', '2026-10-02', '2026-10-03', 1, null, 40],
  [5, '2026-09-29', '2026-10-02', '2026-09-30', '2026-10-03', 2, null, 20],
  [7, '2026-12-29', '2027-01-02', '2026-12-30', '2027-01-04', 3, null, 20],
  [1, '2026-10-02', '2026-10-03', '2026-10-02', '2026-10-02', 0, 'expiredBeforePickup', 0],
  [7, '2026-09-20', '2026-10-03', '2026-09-30', '2026-09-26', -6, 'expiredBeforePickup', 0],
  [3, '2026-10-03', '2026-10-03', '2026-10-03', '2026-10-05', 3, 'fresh', 0],
  [7, '2026-10-01', '2026-10-03', '2026-09-30', '2026-10-07', 5, 'packedInFuture', 0],
  [7, '2026-10-02', '2026-10-03', '2026-10-02', '2026-10-08', 6, 'notNearExpiry', 0],
];

describe('checkDeal', () => {
  it.each(CASES)(
    'N=%i packed %s, pickup %s, today %s',
    (shelfLife, packedOn, pickup, today, bestBefore, daysLeft, problem, suggested) => {
      expect(checkDeal(shelfLife, packedOn, pickup, today)).toEqual({ bestBefore, daysLeft, problem });
      if (problem === null) expect(suggestedDiscount(daysLeft, shelfLife)).toBe(suggested);
    },
  );
});

describe('dealPrice', () => {
  /** Half up to the cent, at least $0.01, never above the list price. */
  it.each([
    [0.6, 20, 0.48],
    [2.6, 40, 1.56],
    [10, 5, 9.5],
    [1.9, 15, 1.62],
    [0.05, 70, 0.02],
    [0.01, 70, 0.01],
    [0, 50, 0],
  ])('%d at %i%% is %d', (listPrice, percent, expected) => {
    expect(dealPrice(listPrice, percent)).toBe(expected);
  });
});

describe('isValidDiscount', () => {
  it.each([
    [5, true],
    [20, true],
    [70, true],
    [0, false],
    [4, false],
    [33, false],
    [75, false],
    [100, false],
  ])('%i%% is %s', (percent, valid) => {
    expect(isValidDiscount(percent)).toBe(valid);
  });
});

describe('todayYmd', () => {
  it('writes the device calendar day', () => {
    expect(todayYmd(new Date(2026, 8, 30, 23, 59))).toBe('2026-09-30');
  });
});
