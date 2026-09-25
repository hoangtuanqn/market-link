export type NavItem = { label: string; to: string };

export const GUEST_NAV: NavItem[] = [
  { label: 'Markets', to: '/markets' },
  { label: 'Products', to: '/products' },
  { label: 'Map', to: '/map' },
  { label: 'About us', to: '/about' },
];

/** A Farmer shops like anyone else, so away from the panel they get the Customer menu too. */
export const CUSTOMER_NAV: NavItem[] = [
  { label: 'Markets', to: '/markets' },
  { label: 'Products', to: '/products' },
  { label: 'Map', to: '/map' },
  { label: 'My orders', to: '/orders' },
  { label: 'Favorites', to: '/favorites' },
];

/** FR-004: khu admin tách khỏi layout Customer/Farmer. */
export const ADMIN_LOGIN_PATH = '/admin/login';
export const ADMIN_HOME_PATH = '/admin';
/** FR-008: bước 2 đăng nhập admin và trang bật / tắt xác thực hai bước. */
export const ADMIN_VERIFY_PATH = '/admin/verify';
export const ADMIN_SECURITY_PATH = '/admin/security';
