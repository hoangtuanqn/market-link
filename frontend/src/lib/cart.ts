import { useSyncExternalStore } from 'react';

/** One product in the cart. `max` is the stock at the time it was added; the server re-checks on preview/place. */
export type CartLine = {
  productId: number;
  name: string;
  unit: string;
  price: number;
  max: number;
  qty: number;
  farmerId: number;
  stallName: string;
};

const KEY = 'ml.cart';
const EMPTY: CartLine[] = [];
const listeners = new Set<() => void>();
let cache: CartLine[] | null = null;

const read = (): CartLine[] => {
  if (cache) return cache;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    cache = Array.isArray(parsed) ? (parsed as CartLine[]) : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
};

const write = (lines: CartLine[]) => {
  cache = lines;
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    // private mode / quota: the in-memory copy still works for this tab
  }
  listeners.forEach((l) => l());
};

const clamp = (line: CartLine, qty: number) => Math.max(1, Math.min(line.max, qty));

/** FR-030 — the cart lives in the browser (S.4.3, no `carts` table); one order per stall is split on preview. */
export const Cart = {
  lines: read,
  count: () => read().reduce((n, l) => n + l.qty, 0),
  add(line: Omit<CartLine, 'qty'>, qty = 1) {
    const lines = read();
    const found = lines.find((l) => l.productId === line.productId);
    write(
      found
        ? lines.map((l) => (l === found ? { ...l, ...line, qty: clamp(l, l.qty + qty) } : l))
        : [...lines, { ...line, qty: clamp({ ...line, qty }, qty) }],
    );
  },
  setQty(productId: number, qty: number) {
    write(read().map((l) => (l.productId === productId ? { ...l, qty: clamp(l, qty) } : l)));
  },
  remove(productId: number) {
    write(read().filter((l) => l.productId !== productId));
  },
  clear() {
    write(EMPTY);
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** The cart lines, re-rendering the component when any tab changes them. */
export function useCart(): CartLine[] {
  return useSyncExternalStore(Cart.subscribe, Cart.lines, () => EMPTY);
}
