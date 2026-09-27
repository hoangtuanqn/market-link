import { describe, expect, it } from 'vitest';
import { sumSales } from './history.helpers';

describe('sumSales', () => {
  it('sums the total amount and counts the rows', () => {
    const rows = [{ totalAmount: 30000 }, { totalAmount: 15000 }, { totalAmount: 25000 }];
    expect(sumSales(rows)).toEqual({ revenue: 70000, count: 3, average: 70000 / 3 });
  });

  it('returns zero for every field when there are no rows', () => {
    expect(sumSales([])).toEqual({ revenue: 0, count: 0, average: 0 });
  });

  it('does not divide by zero when a single row has zero revenue', () => {
    expect(sumSales([{ totalAmount: 0 }])).toEqual({ revenue: 0, count: 1, average: 0 });
  });
});
