/**
 * FR-124 — the near-expiry deal rules (spec §4.5.1–4.5.2), the same table of cases as the backend's DealPolicy, so the
 * dialog shows what the server will accept. Dates are "yyyy-MM-dd" calendar days; day counts go through UTC so a
 * daylight-saving change never adds or drops a day. Ratios are compared in whole numbers (L/N ≤ 0.2 is 5L ≤ N) and
 * prices in whole cents, the way the server rounds.
 */
export const MIN_DISCOUNT = 5;
export const MAX_DISCOUNT = 70;
export const DISCOUNT_STEP = 5;

/** Why a batch cannot go on a deal for that day. */
export type DealProblem = 'packedInFuture' | 'fresh' | 'notNearExpiry' | 'expiredBeforePickup';

export type DealCheck = {
  /** B = H + N − 1: the batch's last good day. */
  bestBefore: string;
  /** L = B − P + 1: days the customer can still use it, the pickup day included. */
  daysLeft: number;
  /** Null when the batch may go on a deal for that day. */
  problem: DealProblem | null;
};

const DAY_MS = 86_400_000;

const toDay = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
};

const fromDay = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10);

/** Eligible when H < P, H ≤ today and 1 ≤ L ≤ ⌈N/2⌉. */
export function checkDeal(shelfLifeDays: number, packedOn: string, pickupDate: string, today: string): DealCheck {
  const packed = toDay(packedOn);
  const pickup = toDay(pickupDate);
  const best = packed + shelfLifeDays - 1;
  const daysLeft = best - pickup + 1;
  let problem: DealProblem | null = null;
  if (packed > toDay(today)) problem = 'packedInFuture';
  else if (packed >= pickup) problem = 'fresh';
  else if (daysLeft < 1) problem = 'expiredBeforePickup';
  else if (daysLeft > Math.ceil(shelfLifeDays / 2)) problem = 'notNearExpiry';
  return { bestBefore: fromDay(best), daysLeft, problem };
}

/** 40% at one day left or L/N ≤ 0.2, 30% at L/N ≤ 0.35, else 20%. */
export function suggestedDiscount(daysLeft: number, shelfLifeDays: number): number {
  if (daysLeft <= 1 || 5 * daysLeft <= shelfLifeDays) return 40;
  if (20 * daysLeft <= 7 * shelfLifeDays) return 30;
  return 20;
}

export function isValidDiscount(percent: number): boolean {
  return (
    Number.isInteger(percent) && percent >= MIN_DISCOUNT && percent <= MAX_DISCOUNT && percent % DISCOUNT_STEP === 0
  );
}

/** List × (100 − percent) / 100, half up to the cent, at least $0.01, never above the list price. */
export function dealPrice(listPrice: number, percent: number): number {
  const listCents = Math.round(listPrice * 100);
  const cents = Math.round((listCents * (100 - percent)) / 100);
  return Math.min(listCents, Math.max(1, cents)) / 100;
}

/** Today in the device's calendar, "yyyy-MM-dd". */
export function todayYmd(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
