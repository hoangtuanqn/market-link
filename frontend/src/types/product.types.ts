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
  desc?: string;
  /** English plural for the unit when it doesn't just take an "s", e.g. "tray of 30" → "trays of 30". */
  plural?: string;
  farmerId?: number;
  /** Category id (contract §5); the Farmer's form picks by id, the public page only needs the name. */
  categoryId?: number;
  imageUrl?: string;
  /** FR-074: an admin hid this listing; only the owning Farmer sees the flag and the reason. */
  hidden?: boolean;
  hiddenReason?: string;
  /** Số ngày còn tươi — chưa có FR chính thức, xem migration V20260926016. Rỗng ở màn còn demo data. */
  shelfLifeDays?: number;
};
