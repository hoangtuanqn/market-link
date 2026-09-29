import type { ShelfLifeDto } from '@/api-requests/shelf-life.requests';
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
  flag?: string;
  status: ProductStatus;
  desc?: string;
  plural?: string;
  farmerId?: number;
  categoryId?: number;
  imageUrl?: string;
  hidden?: boolean;
  hiddenReason?: string;
  shelfLifeDays?: number;
  availableDate?: string;
  nextDate?: string;
  nextLeft?: number;
  nextReserved?: number;
  shelfLife?: ShelfLifeDto;
};
