import type { ProductType } from '@/types/product.types';

/**
 * FR-068 "Stock now": the units still left for each product's nearest orderable day (`nextLeft`), lowest first. The
 * product's own `stock` is only the reference number typed on the product form, not what customers can buy; a product
 * with no orderable day in the next two weeks has nothing to sell, so it counts as 0.
 */
export const stockNow = (products: ProductType[], rows: number) =>
  products
    .map((p) => ({ label: p.name, value: p.nextLeft ?? 0 }))
    .sort((a, b) => a.value - b.value)
    .slice(0, rows);
