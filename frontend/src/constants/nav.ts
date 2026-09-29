import type common from '@/locales/en/common.json';

export type NavItem = { label: keyof (typeof common)['nav']; to: string };

export const GUEST_NAV: NavItem[] = [
  { label: 'markets', to: '/markets' },
  { label: 'products', to: '/products' },
  { label: 'deals', to: '/deals' },
  { label: 'map', to: '/map' },
  { label: 'aboutUs', to: '/about' },
];

export const CUSTOMER_NAV: NavItem[] = [
  { label: 'markets', to: '/markets' },
  { label: 'products', to: '/products' },
  { label: 'deals', to: '/deals' },
  { label: 'map', to: '/map' },
  { label: 'myOrders', to: '/orders' },
  { label: 'favorites', to: '/favorites' },
];

export const REGISTER_PATH = '/register/customer';
export const VERIFY_EMAIL_PATH = '/register/verify';

export const ADMIN_LOGIN_PATH = '/admin/login';
export const ADMIN_HOME_PATH = '/admin';
export const ADMIN_VERIFY_PATH = '/admin/verify';
export const ADMIN_SETUP_2FA_PATH = '/admin/setup-2fa';
export const ADMIN_SECURITY_PATH = '/admin/security';
export const ADMIN_SETTINGS_PATH = '/admin/settings';
export const ADMIN_FARMERS_PATH = '/admin/farmers';
export const ADMIN_REPORTS_PATH = '/admin/reports';
export const ADMIN_ORDERS_PATH = '/admin/orders';
export const ADMIN_CUSTOMERS_PATH = '/admin/customers';
export const ADMIN_MARKETS_PATH = '/admin/markets';
export const ADMIN_MODERATION_PATH = '/admin/moderation';
export const ADMIN_CATEGORIES_PATH = '/admin/categories';
export const ADMIN_ANNOUNCEMENTS_PATH = '/admin/announcements';
export const ADMIN_NOTIFICATIONS_PATH = '/admin/notifications';
export const ADMIN_FEEDBACK_PATH = '/admin/feedback';
export const ADMIN_ACCOUNT_PATH = '/admin/account';
