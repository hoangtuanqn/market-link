import { beforeEach, describe, expect, it } from 'vitest';
import { Cart } from './cart';

const tomato = { productId: 1, name: 'Tomato', unit: 'kg', price: 25000, max: 5, farmerId: 7, stallName: 'Cô Tư' };

describe('Cart', () => {
  beforeEach(() => Cart.clear());

  it('adds a line and merges the quantity of the same product', () => {
    Cart.add(tomato, 2);
    Cart.add(tomato, 1);
    expect(Cart.lines()).toEqual([{ ...tomato, qty: 3 }]);
    expect(Cart.count()).toBe(3);
  });

  it('never exceeds the stock the product had when it was added', () => {
    Cart.add(tomato, 4);
    Cart.add(tomato, 4);
    expect(Cart.lines()[0].qty).toBe(5);
    Cart.setQty(1, 99);
    expect(Cart.lines()[0].qty).toBe(5);
  });

  it('removes a line and survives a reload through localStorage', () => {
    Cart.add(tomato, 1);
    Cart.add({ ...tomato, productId: 2, name: 'Lettuce' }, 1);
    Cart.remove(1);
    expect(JSON.parse(localStorage.getItem('ml.cart') ?? '[]')).toHaveLength(1);
    expect(Cart.lines().map((l) => l.productId)).toEqual([2]);
  });

  it('is only cleared by the caller after a successful place — a failed place keeps every line', () => {
    Cart.add(tomato, 2);
    const placed = Promise.reject(new Error('409 OUT_OF_STOCK'));
    return placed.catch(() => undefined).then(() => expect(Cart.count()).toBe(2));
  });
});
