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

/** FR-004: the admin area is separate from the Customer/Farmer layout. */
export const ADMIN_LOGIN_PATH = '/admin/login';
export const ADMIN_HOME_PATH = '/admin';
/** FR-008: step 2 of admin sign-in and the page to turn two-step verification on / off. */
export const ADMIN_VERIFY_PATH = '/admin/verify';
export const ADMIN_SECURITY_PATH = '/admin/security';
export const ADMIN_SETTINGS_PATH = '/admin/settings';
/** FR-071/D-09: Admin views, approves, suspends a Farmer. */
export const ADMIN_FARMERS_PATH = '/admin/farmers';
/** FR-075: platform-wide order and revenue reports. */
export const ADMIN_REPORTS_PATH = '/admin/reports';
/** FR-070: an admin only reads orders, does not change the status (D-04). */
export const ADMIN_ORDERS_PATH = '/admin/orders';
/** FR-072: an admin locks / unlocks customer accounts. */
export const ADMIN_CUSTOMERS_PATH = '/admin/customers';
/** FR-073: manage markets, operating days and coordinates. */
export const ADMIN_MARKETS_PATH = '/admin/markets';
/** FR-074: hide a violating review or product. */
export const ADMIN_MODERATION_PATH = '/admin/moderation';
/** Categories and units of measure that every stall picks when posting a product. */
export const ADMIN_CATEGORIES_PATH = '/admin/categories';
/** FR-077: platform-wide announcements. */
export const ADMIN_ANNOUNCEMENTS_PATH = '/admin/announcements';
/** FR-042 — the admin's own notifications (new Farmer applications). */
export const ADMIN_NOTIFICATIONS_PATH = '/admin/notifications';
/** FR-081: feedback inbox. */
export const ADMIN_FEEDBACK_PATH = '/admin/feedback';
/** The admin's personal information and password; the two-step verification part lives in ADMIN_SECURITY_PATH. */
export const ADMIN_ACCOUNT_PATH = '/admin/account';
