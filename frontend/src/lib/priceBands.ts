export const LOW = 1;
export const HIGH = 3;

export const PRICE_BANDS = [
  { value: 'any', min: undefined, max: undefined },
  { value: 'low', min: undefined, max: LOW - 0.01 },
  { value: 'mid', min: LOW, max: HIGH },
  { value: 'high', min: HIGH + 0.01, max: undefined },
] as const;

export type PriceBand = (typeof PRICE_BANDS)[number]['value'];

export const bandOf = (value: string | null): (typeof PRICE_BANDS)[number] =>
  PRICE_BANDS.find((b) => b.value === value) ?? PRICE_BANDS[0];
