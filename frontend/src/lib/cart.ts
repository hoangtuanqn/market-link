import { useSyncExternalStore } from 'react';

export type CartLine = {
  productId: number;
  name: string;
  unit: string;
  price: number;
  max: number;
  qty: number;
  farmerId: number;
  stallName: string;
  pickupDate?: string;
};

const KEY = 'ml.cart';
const EMPTY: CartLine[] = [];
const listeners = new Set<() => void>();
let cache: CartLine[] | null = null;

const isUsable = (line: unknown): line is CartLine => {
  const l = line as Partial<CartLine> | null;
  return !!l && Number.isInteger(l.productId) && Number.isInteger(l.qty) && (l.qty as number) >= 1;
};

const read = (): CartLine[] => {
  if (cache) return cache;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    cache = Array.isArray(parsed) ? parsed.filter(isUsable) : EMPTY;
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

const clamp = (line: CartLine, qty: number) => {
  const wanted = Number.isFinite(qty) ? Math.floor(qty) : 1;
  const max = Number.isFinite(line.max) && line.max >= 1 ? line.max : wanted;
  return Math.max(1, Math.min(max, wanted));
};

export const Cart = {
  lines: read,
  count: () => read().reduce((n, l) => n + l.qty, 0),
  add(line: Omit<CartLine, 'qty'>, qty = 1) {
    const lines = read();
    const found = lines.find((l) => l.productId === line.productId);
    write(
      found
        ? lines.map((l) => {
            if (l !== found) return l;
            const merged = { ...l, ...line };
            return { ...merged, qty: clamp(merged, l.qty + qty) };
          })
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

export function useCart(): CartLine[] {
  return useSyncExternalStore(Cart.subscribe, Cart.lines, () => EMPTY);
}
