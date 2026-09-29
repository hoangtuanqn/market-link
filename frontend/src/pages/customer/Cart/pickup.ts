import type { SlotDto } from '@/api-requests/stall.requests';

const HCMC_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

export const todayInHcmc = (now: Date = new Date()) => HCMC_DAY.format(now);

export type Choice = {
  marketId: number | null;
  date: string | null;
  shown: string | null;
  slotId: string | null;
  note: string;
};

export const NO_CHOICE: Choice = { marketId: null, date: null, shown: null, slotId: null, note: '' };

export type Pickup = {
  marketId: number | null;
  days: string[];
  bookable: Set<string>;
  shownDay: string | null;
  pricedDay: string | null;
  goneDealDays: string[];
};

const bySlotTime = (a: SlotDto, b: SlotDto) =>
  a.slotDate.localeCompare(b.slotDate) || a.startTime.localeCompare(b.startTime) || a.marketId - b.marketId;

export function pickupOf(slots: SlotDto[], choice: Choice, dealDays: string[]): Pickup {
  const sorted = [...slots].sort(bySlotTime);
  const free = sorted.filter((s) => !s.isFull);
  const offered = new Set(free.map((s) => s.slotDate));
  const dealDay = dealDays.find((d) => offered.has(d));
  const marketId =
    choice.marketId ??
    (dealDay ? free.find((s) => s.slotDate === dealDay)?.marketId : undefined) ??
    free[0]?.marketId ??
    sorted[0]?.marketId ??
    null;
  const here = sorted.filter((s) => s.marketId === marketId);
  const days = [...new Set(here.map((s) => s.slotDate))];
  const bookable = new Set(here.filter((s) => !s.isFull).map((s) => s.slotDate));
  const pricedDay =
    [choice.date, ...dealDays].find((d): d is string => d != null && bookable.has(d)) ??
    days.find((d) => bookable.has(d)) ??
    null;
  const shownDay = choice.shown != null && days.includes(choice.shown) ? choice.shown : (pricedDay ?? days[0] ?? null);
  return { marketId, days, bookable, shownDay, pricedDay, goneDealDays: dealDays.filter((d) => !offered.has(d)) };
}
