/**
 * The price bands the product filters offer, shared by /products and /search so both screens mean the same thing by
 * "Under $1.00". `min`/`max` become `minPrice`/`maxPrice` on the request (contract §5); prices are USD with cents, so
 * the band edges step by a cent and leave no gap a real price can fall into.
 */
export const LOW = 1;
export const HIGH = 3;

export const PRICE_BANDS = [
  { value: 'any', min: undefined, max: undefined },
  { value: 'low', min: undefined, max: LOW - 0.01 },
  { value: 'mid', min: LOW, max: HIGH },
  { value: 'high', min: HIGH + 0.01, max: undefined },
] as const;

export type PriceBand = (typeof PRICE_BANDS)[number]['value'];

/** The band a value names, or the "no filter" band when it names none. */
export const bandOf = (value: string | null): (typeof PRICE_BANDS)[number] =>
  PRICE_BANDS.find((b) => b.value === value) ?? PRICE_BANDS[0];
