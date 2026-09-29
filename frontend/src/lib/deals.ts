export const MIN_DISCOUNT = 5;
export const MAX_DISCOUNT = 70;
export const DISCOUNT_STEP = 5;

export type DealProblem = 'packedInFuture' | 'fresh' | 'notNearExpiry' | 'expiredBeforePickup';

export type DealCheck = {
  bestBefore: string;
  daysLeft: number;
  problem: DealProblem | null;
};

const DAY_MS = 86_400_000;

const toDay = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
};

const fromDay = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10);

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

export function dealPrice(listPrice: number, percent: number): number {
  const listCents = Math.round(listPrice * 100);
  const cents = Math.round((listCents * (100 - percent)) / 100);
  return Math.min(listCents, Math.max(1, cents)) / 100;
}

export function todayYmd(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
