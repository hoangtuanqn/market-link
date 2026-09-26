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
  /** Id danh mục (contract §5); form của Farmer chọn theo id, trang public chỉ cần tên. */
  categoryId?: number;
  imageUrl?: string;
  /** FR-074: admin đã ẩn listing này; chỉ Farmer sở hữu nhìn thấy cờ và lý do. */
  hidden?: boolean;
  hiddenReason?: string;
};
