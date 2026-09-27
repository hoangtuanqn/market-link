export type MarketType = {
  id: number;
  name: string;
  address: string;
  district: string;
  /** Day of week, 0 = Sunday … 6 = Saturday */
  days: number[];
  open: string;
  close: string;
  lat: number;
  lng: number;
  stalls: number;
  distance?: string;
  images?: string[];
};

export type AnnouncementType = {
  title: string;
  text: string;
};

/**
 * One-off market closures: a day the market does not open even though it falls on an operating day. `handling` is what
 * happens to orders already placed for that day — the SRS does not define it, so the screen marks it as open.
 */
export type ClosureHandling = 'move' | 'contact' | 'cancel';

export type ClosureType = {
  id: number;
  marketId: number;
  date: string;
  /** English weekday name; the screen shows it under the date. */
  weekday: string;
  reason: string;
  handling: ClosureHandling;
  /** Orders already placed for that day. */
  orders: number;
  announced: boolean;
  by: string;
};

export const CLOSURE_HANDLINGS: ClosureHandling[] = ['move', 'contact', 'cancel'];
