import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import useAddDeal from './useAddDeal';
import type { DealDto } from '@/api-requests/deal.requests';
import { Cart } from '@/lib/cart';

const tomato: DealDto = {
  productId: 7,
  name: 'Cà chua bi',
  imageUrl: null,
  unit: 'kg',
  stallName: 'Nông trại Hoa Đà Lạt',
  farmerId: 3,
  marketNames: ['Chợ Bà Chiểu'],
  stockDate: '2026-10-03',
  listPrice: 0.6,
  unitPrice: 0.48,
  discountPercent: 20,
  bestBefore: '2026-10-05',
  daysLeft: 3,
  quantityAvailable: 12,
  storageMode: 'room',
};

beforeEach(() => {
  localStorage.clear();
  Cart.clear();
});

describe('useAddDeal', () => {
  it('adds the deal to the cart, priced at the deal price and dated for its pickup day', () => {
    const { result } = renderHook(() => useAddDeal());

    result.current(tomato);

    expect(Cart.lines()).toEqual([
      expect.objectContaining({
        productId: 7,
        name: 'Cà chua bi',
        unit: 'kg',
        price: 0.48,
        max: 12,
        farmerId: 3,
        stallName: 'Nông trại Hoa Đà Lạt',
        pickupDate: '2026-10-03',
      }),
    ]);
  });
});
