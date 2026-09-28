import type { SlotDto } from '@/api-requests/stall.requests';

const HCMC_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

/** Today's date in Ho Chi Minh City as "yyyy-MM-dd" (en-CA writes it that way), whatever the device's zone. */
export const todayInHcmc = (now: Date = new Date()) => HCMC_DAY.format(now);

/**
 * What the customer picked for one stall; null means not picked, so the default applies. `date` is the last day they
 * picked that still had a free time: the day the stall is priced and ordered for. `shown` is the day chip they last
 * clicked, which may be fully booked: it is shown with its full times, never priced.
 */
export type Choice = {
  marketId: number | null;
  date: string | null;
  shown: string | null;
  slotId: string | null;
  note: string;
};

export const NO_CHOICE: Choice = { marketId: null, date: null, shown: null, slotId: null, note: '' };

/** One stall's pickup as the cart shows it and prices it (FR-032, FR-125 spec §4.5.5). */
export type Pickup = {
  /** The market shown selected; null only when the stall has no slot at all. */
  marketId: number | null;
  /** Every day with a time at that market, fully booked ones included: the day chips. */
  days: string[];
  /** The days with a free time at that market. */
  bookable: Set<string>;
  /** The day chip shown selected. */
  shownDay: string | null;
  /** The one day the stall is priced and ordered for, always one with a free time at `marketId`; null when none. */
  pricedDay: string | null;
  /** Deal days of the stall's lines that no market of the stall can take any more. */
  goneDealDays: string[];
};

const bySlotTime = (a: SlotDto, b: SlotDto) =>
  a.slotDate.localeCompare(b.slotDate) || a.startTime.localeCompare(b.startTime) || a.marketId - b.marketId;

/**
 * Works out one stall's pickup from its slots at every market it sells at. The market: the one the customer chose, else
 * one that still has the deal day free, else the one with the soonest free time. The priced day: the day the customer
 * chose, else a deal day free at that market, else the first day with a free time there. `dealDays` are the days the
 * stall's lines were added for from /deals, in cart order, past days already dropped; the first one some market still
 * offers wins.
 */
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
