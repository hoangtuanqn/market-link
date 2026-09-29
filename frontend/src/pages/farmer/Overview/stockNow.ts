import type { ProductType } from '@/types/product.types';

export const stockNow = (products: ProductType[], rows: number) =>
  products
    .map((p) => ({ label: p.name, value: p.nextLeft ?? 0 }))
    .sort((a, b) => a.value - b.value)
    .slice(0, rows);
