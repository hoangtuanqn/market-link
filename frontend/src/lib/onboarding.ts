import SettingsApi from '@/api-requests/settings.requests';
import SettingsStore, { normalize } from '@/lib/settings';
import type common from '@/locales/en/common.json';

export type TourRole = 'customer' | 'farmer';

type StepKey = keyof (typeof common)['tour']['steps'];

export type TourStep = {
  key: StepKey;
  target?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
};

const nav = (path: string, key: StepKey): TourStep => ({ key, target: `nav:${path}`, side: 'right' });

export const TOURS: Record<TourRole, TourStep[]> = {
  customer: [
    { key: 'customerWelcome' },
    { key: 'customerMarkets', target: 'header:markets', side: 'bottom' },
    { key: 'customerProducts', target: 'header:products', side: 'bottom' },
    { key: 'customerMap', target: 'header:map', side: 'bottom' },
    { key: 'customerSearch', target: 'header:search', side: 'bottom' },
    { key: 'customerCart', target: 'header:cart', side: 'bottom' },
    { key: 'customerOrders', target: 'header:myOrders', side: 'bottom' },
    { key: 'customerFavorites', target: 'header:favorites', side: 'bottom' },
    { key: 'customerMessages', target: 'header:messages', side: 'bottom' },
    { key: 'customerNotifications', target: 'header:notifications', side: 'bottom' },
    { key: 'customerAccount', target: 'header:account', side: 'bottom' },
    { key: 'customerMenu', target: 'header:menu', side: 'bottom' },
    { key: 'customerDone' },
  ],
  farmer: [
    { key: 'farmerWelcome' },
    nav('/farmer', 'farmerOverview'),
    nav('/farmer/orders', 'farmerOrders'),
    nav('/farmer/slots', 'farmerSlots'),
    nav('/farmer/stock', 'farmerStock'),
    nav('/farmer/products', 'farmerProducts'),
    nav('/farmer/stall', 'farmerStall'),
    nav('/farmer/reviews', 'farmerReviews'),
    nav('/farmer/history', 'farmerHistory'),
    nav('/farmer/messages', 'farmerMessages'),
    nav('/farmer/notifications', 'farmerNotifications'),
    nav('/farmer/settings', 'farmerSettings'),
    { key: 'dashboardMenu', target: 'shell:menu', side: 'bottom' },
    { key: 'farmerDone' },
  ],
};

export const isOnScreen = (el: Element | null): el is HTMLElement => {
  if (!el || el.getClientRects().length === 0) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.right > 0 && r.left < window.innerWidth;
};

const DONE = 'done';
const extrasKey = (role: TourRole) => `tour.${role}`;
const localKey = (userId: string | number, role: TourRole) => `ml-tour:${userId}:${role}`;

const seenLocally = (userId: string | number, role: TourRole) => {
  try {
    return localStorage.getItem(localKey(userId, role)) === DONE;
  } catch {
    return false; // private window
  }
};

export const shouldShowTour = async (userId: string | number, role: TourRole): Promise<boolean> => {
  if (seenLocally(userId, role)) return false;
  try {
    const res = await SettingsApi.get();
    return res.data?.extras?.[extrasKey(role)] !== DONE;
  } catch {
    return false;
  }
};

export const markTourSeen = async (userId: string | number, role: TourRole) => {
  try {
    localStorage.setItem(localKey(userId, role), DONE);
  } catch {
    // private window: the server copy below still counts
  }
  try {
    const server = (await SettingsApi.get()).data;
    const current = server ? normalize(server) : SettingsStore.get();
    const saved = await SettingsApi.save({ ...current, extras: { ...current.extras, [extrasKey(role)]: DONE } });
    if (saved.data) SettingsStore.set(normalize(saved.data));
  } catch {
    // offline / too many extras: the local copy keeps the tour closed on this device
  }
};
