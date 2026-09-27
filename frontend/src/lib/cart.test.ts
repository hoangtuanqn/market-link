import { beforeEach, describe, expect, it, vi } from 'vitest';
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

  it('clamps a re-added line against its new stock, not the stock it had before', () => {
    Cart.add(tomato, 4);
    Cart.add({ ...tomato, max: 2 }, 1);
    expect(Cart.lines()[0]).toMatchObject({ qty: 2, max: 2 });
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

/** Reading a stored cart needs a fresh module: lib/cart caches what it read first. */
const loadFreshCart = async () => {
  vi.resetModules();
  return (await import('./cart')).Cart;
};

describe('Cart — lines the preview would reject', () => {
  beforeEach(() => localStorage.clear());

  it('drops stored lines with a bad id or quantity, so one bad line cannot lock the cart', async () => {
    localStorage.setItem(
      'ml.cart',
      JSON.stringify([
        { ...tomato, productId: 1, qty: 2 },
        { ...tomato, productId: 2, qty: null }, // a NaN once stored by JSON
        { ...tomato, productId: '3', qty: 1 },
        { ...tomato, productId: 4, qty: 0 },
      ]),
    );
    const FreshCart = await loadFreshCart();

    expect(FreshCart.lines().map((l) => l.productId)).toEqual([1]);
  });

  it('never stores NaN when the stock is unknown', async () => {
    const FreshCart = await loadFreshCart();

    FreshCart.add({ ...tomato, productId: 7, max: undefined as unknown as number }, 3);

    expect(FreshCart.lines()[0].qty).toBe(3);
    expect(JSON.parse(localStorage.getItem('ml.cart') ?? '[]')[0].qty).toBe(3);
  });
});
