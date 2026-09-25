import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
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
import { farmer } from '@/data/catalog';
import { farmerOrders } from '@/data/farmer';
import type common from '@/locales/en/common.json';
import DashboardShell, { type ShellNavGroup } from './DashboardShell';

/** `heading` and `label` are keys under `farmerNav.` in common.json, looked up when rendering. */
type FarmerNavKey = keyof (typeof common)['farmerNav'];
type NavItem = { to: string; label: FarmerNavKey; icon: ComponentType<IconProps>; count?: number };
type NavGroup = { heading: FarmerNavKey; items: NavItem[] };

const AWAITING_COUNT = farmerOrders.filter((o) => o.status === 'placed').length;

const NAV: NavGroup[] = [
  {
    heading: 'today',
    items: [
      { to: '/farmer', label: 'overview', icon: DashboardIcon },
      { to: '/farmer/orders', label: 'incomingOrders', icon: ReceiptIcon, count: AWAITING_COUNT },
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
      { to: '/farmer/messages', label: 'messages', icon: ChatIcon, count: 1 },
      { to: '/farmer/notifications', label: 'notifications', icon: BellIcon, count: 2 },
    ],
  },
  {
    heading: 'account',
    items: [
      { to: '/account', label: 'yourAccount', icon: UsersIcon },
      { to: '/farmer/promote', label: 'promote', icon: TagIcon },
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
  const f = farmer(1)!;

  const nav: ShellNavGroup[] = NAV.map((g) => ({
    heading: t(`farmerNav.${g.heading}`),
    items: g.items.map((it) => ({ ...it, label: t(`farmerNav.${it.label}`) })),
  }));

  return (
    <DashboardShell
      badge={t('farmerNav.badge')}
      navLabel={t('farmerNav.navigation')}
      homeLabel={t('farmerNav.home')}
      home="/farmer"
      nav={nav}
      context={{
        mono: f.stall.charAt(0),
        name: f.stall,
        sub: t('farmerNav.approvedMarkets', { count: f.markets.length }),
      }}
      user={{ mono: 'CT', email: 'cotu@example.com', line: t('farmerNav.roleStall', { stall: 'Cô Tư Garden' }) }}
      searchId="farmer-appq"
      searchPlaceholder={t('farmerNav.searchPlaceholder')}
      accountTo="/account"
      headerActions={
        <Link
          to="/farmer/notifications"
          aria-label={t('header.notificationsUnread', { count: 2 })}
          className="border-line-strong bg-surface-raised text-ink relative grid size-10 flex-none place-items-center rounded-sm border-[1.5px] no-underline"
        >
          <BellIcon />
          <span className="bg-danger text-on-danger absolute -top-1.5 -right-1.5 grid size-4.5 place-items-center rounded-full text-[10px] font-bold">
            2
          </span>
        </Link>
      }
    />
  );
};

export default FarmerLayout;
