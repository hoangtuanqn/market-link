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

/** Thanh điều hướng khu Admin, theo đúng thứ tự màn hình trong docs/prototype/prototype.js (SCREENS.admin). */
export const ADMIN_NAV: NavItem[] = [
  { label: 'Overview', to: ADMIN_HOME_PATH },
  { label: 'Farmers', to: '/admin/farmers' },
  { label: 'Customers', to: '/admin/customers' },
  { label: 'Markets', to: '/admin/markets' },
  { label: 'Moderation', to: '/admin/moderation' },
  { label: 'Orders', to: '/admin/orders' },
  { label: 'Revenue', to: '/admin/revenue' },
  { label: 'Reports', to: '/admin/reports' },
  { label: 'Categories', to: '/admin/categories' },
  { label: 'Announcements', to: '/admin/announcements' },
  { label: 'Feedback', to: '/admin/feedback' },
  { label: 'Pricing', to: '/admin/pricing' },
  { label: 'Settings', to: '/admin/settings' },
];
