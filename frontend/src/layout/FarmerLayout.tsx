import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import NotificationBell from '@/components/notifications/NotificationBell';
import OnboardingTour from '@/components/OnboardingTour';
import useUnreadNotifications from '@/hooks/useUnreadNotifications';
import useChatUnread from '@/hooks/useChatUnread';
import {
  BellIcon,
  BoxIcon,
  CartIcon,
  ChartIcon,
  ChatIcon,
  ClockIcon,
  DashboardIcon,
  ReceiptIcon,
  ShieldIcon,
  SlidersIcon,
  StarIcon,
  StoreIcon,
  TagIcon,
  UsersIcon,
  type IconProps,
} from '@/components/icons';
import OrderApi from '@/api-requests/order.requests';
import StallApi from '@/api-requests/stall.requests';
import useRequest from '@/hooks/useRequest';
import useSession from '@/hooks/useSession';
import { initials } from '@/lib/avatar';
import type common from '@/locales/en/common.json';
import DashboardShell, { type ShellNavGroup } from './DashboardShell';

/** `heading` and `label` are keys under `farmerNav.` in common.json, looked up when rendering. */
type FarmerNavKey = keyof (typeof common)['farmerNav'];
type NavItem = { to: string; label: FarmerNavKey; icon: ComponentType<IconProps>; count?: number };
type NavGroup = { heading: FarmerNavKey; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    heading: 'today',
    items: [
      { to: '/farmer', label: 'overview', icon: DashboardIcon },
      { to: '/farmer/orders', label: 'incomingOrders', icon: ReceiptIcon },
      { to: '/farmer/slots', label: 'pickupSlots', icon: ClockIcon },
    ],
  },
  {
    heading: 'stock',
    items: [
      { to: '/farmer/stock', label: 'weekStock', icon: BoxIcon },
      { to: '/farmer/products', label: 'products', icon: TagIcon },
    ],
  },
  {
    heading: 'stall',
    items: [
      { to: '/farmer/stall', label: 'stallPickup', icon: StoreIcon },
      { to: '/farmer/reviews', label: 'reviews', icon: StarIcon },
      { to: '/farmer/history', label: 'salesHistory', icon: ChartIcon },
    ],
  },
  {
    heading: 'inbox',
    items: [
      { to: '/farmer/messages', label: 'messages', icon: ChatIcon },
      { to: '/farmer/notifications', label: 'notifications', icon: BellIcon },
    ],
  },
  {
    heading: 'account',
    items: [
      { to: '/account', label: 'yourAccount', icon: UsersIcon },
      { to: '/farmer/pending', label: 'approval', icon: ShieldIcon },
      { to: '/farmer/settings', label: 'settings', icon: SlidersIcon },
    ],
  },
  {
    heading: 'shop',
    items: [{ to: '/markets', label: 'shopMarkets', icon: CartIcon }],
  },
];

/** Farmer dashboard — board-green sidebar + quiet work-area header (DashboardShell). */
const FarmerLayout = () => {
  const { t } = useTranslation();
  const unread = useUnreadNotifications();
  const { user } = useSession();
  const { pathname } = useLocation();
  const { state: profileLoad } = useRequest('farmer-layout-profile', () => StallApi.myProfile());
  const profile = profileLoad.kind === 'ready' ? profileLoad.data : null;
  const stallName = profile?.stallName ?? user?.fullName ?? '';
  // FR-113: the real unread count, replacing the hardcoded 1
  const chatUnread = useChatUnread();
  // The "incoming orders" badge; re-fetched on every navigation inside the panel (FarmerLayout is the persistent
  // Outlet parent, so accept/decline on /farmer/orders would otherwise leave a stale count until a full reload).
  const { state: placedLoad } = useRequest(`farmer-placed-count:${pathname}`, () =>
    OrderApi.farmerList({ status: 'placed', pageSize: 1 }),
  );
  const awaiting = placedLoad.kind === 'ready' ? placedLoad.data.total : undefined;

  const nav: ShellNavGroup[] = NAV.map((g) => ({
    heading: t(`farmerNav.${g.heading}`),
    items: g.items.map((it) => ({
      ...it,
      label: t(`farmerNav.${it.label}`),
      count:
        it.to === '/farmer/notifications'
          ? unread || undefined
          : it.to === '/farmer/messages'
            ? chatUnread || undefined
            : it.to === '/farmer/orders'
              ? awaiting || undefined
              : it.count,
    })),
  }));

  return (
    <>
      <OnboardingTour role="farmer" />
      <DashboardShell
        badge={t('farmerNav.badge')}
        navLabel={t('farmerNav.navigation')}
        homeLabel={t('farmerNav.home')}
        home="/farmer"
        nav={nav}
        context={{
          mono: stallName.trim().charAt(0).toUpperCase(),
          name: stallName,
          sub:
            profile?.approvalStatus === 'approved'
              ? t('farmerNav.approvedMarkets', { count: profile.markets.length })
              : t('farmerNav.badge'),
        }}
        user={{
          mono: initials(user?.fullName, user?.email),
          email: user?.email ?? '',
          line: t('farmerNav.roleStall', { stall: stallName }),
        }}
        searchId="farmer-appq"
        searchPlaceholder={t('farmerNav.searchPlaceholder')}
        accountTo="/account"
        headerActions={<NotificationBell to="/farmer/notifications" />}
        className="bg-surface-quiet"
      />
    </>
  );
};

export default FarmerLayout;
