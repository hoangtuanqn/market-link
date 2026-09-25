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
} from '@/components/icons';
import { farmer } from '@/data/catalog';
import { farmerOrders } from '@/data/farmer';
import DashboardShell, { type ShellNavGroup } from './DashboardShell';

const AWAITING_COUNT = farmerOrders.filter((o) => o.status === 'placed').length;

const NAV: ShellNavGroup[] = [
  {
    heading: 'Today',
    items: [
      { to: '/farmer', label: 'Overview', icon: DashboardIcon },
      { to: '/farmer/orders', label: 'Incoming orders', icon: ReceiptIcon, count: AWAITING_COUNT },
      { to: '/farmer/slots', label: 'Pickup slots', icon: ClockIcon },
    ],
  },
  {
    heading: 'Stock',
    items: [
      { to: '/farmer/stock', label: "This week's stock", icon: BoxIcon },
      { to: '/farmer/products', label: 'Products', icon: TagIcon },
    ],
  },
  {
    heading: 'Stall',
    items: [
      { to: '/farmer/stall', label: 'Stall & pickup', icon: StoreIcon },
      { to: '/farmer/reviews', label: 'Reviews', icon: StarIcon },
      { to: '/farmer/history', label: 'Sales history', icon: ChartIcon },
    ],
  },
  {
    heading: 'Inbox',
    items: [
      { to: '/farmer/messages', label: 'Messages', icon: ChatIcon, count: 1 },
      { to: '/farmer/notifications', label: 'Notifications', icon: BellIcon, count: 2 },
    ],
  },
  {
    heading: 'Account',
    items: [
      { to: '/account', label: 'Your account', icon: UsersIcon },
      { to: '/farmer/promote', label: 'Promote & listings', icon: TagIcon },
      { to: '/farmer/pending', label: 'Approval status', icon: ShieldIcon },
      { to: '/farmer/settings', label: 'Settings', icon: SlidersIcon },
    ],
  },
  {
    heading: 'Shop',
    items: [{ to: '/markets', label: 'Shop at the markets', icon: CartIcon }],
  },
];

/** Farmer dashboard — board-green sidebar + quiet work-area header (DashboardShell). */
const FarmerLayout = () => {
  const f = farmer(1)!;

  return (
    <DashboardShell
      badge="Farmer"
      home="/farmer"
      nav={NAV}
      context={{ mono: f.stall.charAt(0), name: f.stall, sub: `Approved · ${f.markets.length} markets` }}
      user={{ mono: 'CT', email: 'cotu@example.com', line: 'Farmer · Cô Tư Garden' }}
      searchId="farmer-appq"
      searchPlaceholder="Order code or customer"
      accountTo="/account"
      headerActions={
        <Link
          to="/farmer/notifications"
          aria-label="Notifications, 2 unread"
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
