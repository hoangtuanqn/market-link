import type common from '@/locales/en/common.json';

/** `label` is a key under `nav.` in common.json; the link text is looked up when it is rendered. */
export type NavItem = { label: keyof (typeof common)['nav']; to: string };

export const GUEST_NAV: NavItem[] = [
  { label: 'markets', to: '/markets' },
  { label: 'products', to: '/products' },
  { label: 'map', to: '/map' },
  { label: 'aboutUs', to: '/about' },
];

/** A Farmer shops like anyone else, so away from the panel they get the Customer menu too. */
export const CUSTOMER_NAV: NavItem[] = [
  { label: 'markets', to: '/markets' },
  { label: 'products', to: '/products' },
  { label: 'map', to: '/map' },
  { label: 'myOrders', to: '/orders' },
  { label: 'favorites', to: '/favorites' },
];

/** FR-004: khu admin tách khỏi layout Customer/Farmer. */
export const ADMIN_LOGIN_PATH = '/admin/login';
export const ADMIN_HOME_PATH = '/admin';
/** FR-008: bước 2 đăng nhập admin và trang bật / tắt xác thực hai bước. */
export const ADMIN_VERIFY_PATH = '/admin/verify';
export const ADMIN_SECURITY_PATH = '/admin/security';
export const ADMIN_SETTINGS_PATH = '/admin/settings';
/** FR-071/D-09: Admin xem, duyệt, đình chỉ Farmer. */
export const ADMIN_FARMERS_PATH = '/admin/farmers';
/** FR-075: báo cáo đơn hàng và doanh thu toàn sàn. */
export const ADMIN_REPORTS_PATH = '/admin/reports';
/** Ngoài phạm vi SRS — doanh thu của chính MarketLink, xem banner cảnh báo trên trang. */
export const ADMIN_REVENUE_PATH = '/admin/revenue';
export const ADMIN_PRICING_PATH = '/admin/pricing';
/** FR-070: admin chỉ đọc đơn hàng, không đổi trạng thái (D-04). */
export const ADMIN_ORDERS_PATH = '/admin/orders';
/** FR-072: admin khoá / mở khoá tài khoản khách. */
export const ADMIN_CUSTOMERS_PATH = '/admin/customers';
/** FR-073: quản lý chợ, ngày họp và toạ độ. */
export const ADMIN_MARKETS_PATH = '/admin/markets';
/** FR-074: ẩn đánh giá hoặc sản phẩm vi phạm. */
export const ADMIN_MODERATION_PATH = '/admin/moderation';
/** Danh mục và đơn vị tính mà mọi gian hàng chọn khi đăng sản phẩm. */
export const ADMIN_CATEGORIES_PATH = '/admin/categories';
/** FR-077: thông báo toàn sàn. */
export const ADMIN_ANNOUNCEMENTS_PATH = '/admin/announcements';
/** FR-081: hộp thư góp ý. */
export const ADMIN_FEEDBACK_PATH = '/admin/feedback';
/** Thông tin cá nhân và mật khẩu của admin; phần xác thực hai bước nằm ở ADMIN_SECURITY_PATH. */
export const ADMIN_ACCOUNT_PATH = '/admin/account';
