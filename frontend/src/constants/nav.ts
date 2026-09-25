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
