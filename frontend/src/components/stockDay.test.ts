import { describe, expect, it } from 'vitest';
import { stockDay } from './stockDay';

describe('stockDay', () => {
  it('names an ISO pickup date as its weekday and day/month, on that calendar day', () => {
    expect(stockDay('2026-10-03')).toBe('Sat 03/10');
  });

  it('is null when there is no date or it is not ISO', () => {
    expect(stockDay(undefined)).toBeNull();
    expect(stockDay(null)).toBeNull();
    expect(stockDay('next Saturday')).toBeNull();
  });
});
