import { describe, expect, it } from 'vitest';
import type { ProductType } from '@/types/product.types';
import { stockNow } from './stockNow';

const product = (id: number, stock: number, nextLeft?: number): ProductType =>
  ({ id, name: `P${id}`, stock, nextLeft, nextDate: nextLeft === undefined ? undefined : '2026-10-03' }) as ProductType;

describe('stockNow (FR-068)', () => {
  it('shows the units left for the nearest orderable day, not the reference number', () => {
    expect(stockNow([product(1, 40, 3), product(2, 30, 28)], 6)).toEqual([
      { label: 'P1', value: 3 },
      { label: 'P2', value: 28 },
    ]);
  });

  it('counts a product with no orderable day in the next two weeks as 0 and puts the lowest first', () => {
    expect(stockNow([product(1, 40, 12), product(2, 25), product(3, 5, 7)], 2)).toEqual([
      { label: 'P2', value: 0 },
      { label: 'P3', value: 7 },
    ]);
  });
});
