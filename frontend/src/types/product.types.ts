import type { PRODUCT_STATUS } from '@/constants/enums';

export type ProductStatus = (typeof PRODUCT_STATUS)[keyof typeof PRODUCT_STATUS];

export type ProductType = {
  id: number;
  name: string;
  stall: string;
  marketName: string;
  category: string;
  price: number;
  was?: number;
  unit: string;
  stock: number;
  /** Seller's handwritten note, e.g. "Fresh today" */
  flag?: string;
  status: ProductStatus;
  favorite?: boolean;
};
