import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  BellIcon,
  BoxIcon,
  CartIcon,
  ChartIcon,
  ChatIcon,
  ChevronLeftIcon,
  ClockIcon,
  DashboardIcon,
  FoldIcon,
  LogOutIcon,
  MenuIcon,
  ReceiptIcon,
  SearchIcon,
  ShieldIcon,
  SlidersIcon,
  StarIcon,
  StoreIcon,
  SwapIcon,
  TagIcon,
  LogoMark,
  UsersIcon,
  type IconProps,
} from '@/components/icons';
import { farmer } from '@/data/catalog';
import { farmerOrders } from '@/data/farmer';
import Helper from '@/utils/helper';

type NavItem = { to: string; label: string; icon: ComponentType<IconProps>; count?: number };
type NavGroup = { heading: string; items: NavItem[] };

const AWAITING_COUNT = farmerOrders.filter((o) => o.status === 'placed').length;

const NAV: NavGroup[] = [
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

const TOP_LEVEL_PATHS = new Set(NAV.flatMap((g) => g.items.map((i) => i.to)));

const FOLD_KEY = 'pt-side';

/**
 * Farmer dashboard shell — board-green sidebar with grouped navigation, a quiet work-area header (prototype flags this
 * as a design-system deviation from the single SiteHeader; kept here for FE1/LEAD to confirm).
 */
const FarmerLayout = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [folded, setFolded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const f = farmer(1)!;

  useEffect(() => {
    try {
      setFolded(localStorage.getItem(FOLD_KEY) === 'folded');
    } catch {
      /* private window */
    }
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  const toggleFold = () => {
    setFolded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(FOLD_KEY, next ? 'folded' : 'open');
      } catch {
        /* private window */
      }
      return next;
    });
  };

  const showBack = !TOP_LEVEL_PATHS.has(pathname);

  const nav = useMemo(
    () => (
      <nav aria-label="Sections" className="flex flex-1 flex-col gap-4">
        {NAV.map((g) => (
          <div key={g.heading} className="flex flex-col gap-0.5">
            <h2
              className={Helper.cn(
                'text-board-muted text-overline m-0 px-3',
                folded && 'sr-only lg:not-sr-only lg:px-3',
              )}
            >
              {g.heading}
            </h2>
            {g.items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.to === '/farmer'}
                title={it.label}
                className={({ isActive }) =>
                  Helper.cn(
                    'text-board-muted relative flex min-h-10 items-center gap-3 rounded-sm px-3 text-[15px] font-medium no-underline',
                    isActive
                      ? 'text-on-board bg-brand-strong font-bold shadow-[inset_3px_0_0_var(--accent)]'
                      : 'hover:text-on-board hover:bg-brand-strong',
                    folded && 'lg:justify-center lg:px-0',
                  )
                }
              >
                <it.icon size={18} className="flex-none" />
                <span className={folded ? 'lg:hidden' : undefined}>{it.label}</span>
                {it.count ? (
                  <span
                    className={Helper.cn(
                      'bg-accent text-on-accent ml-auto grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold tabular-nums',
                      folded && 'lg:absolute lg:top-0.5 lg:right-0.5 lg:ml-0 lg:h-4 lg:min-w-4 lg:px-1 lg:text-[10px]',
                    )}
                  >
                    {it.count}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    ),
    [folded],
  );

  return (
    <div
      className={Helper.cn(
        'grid min-h-screen flex-1 grid-cols-1 lg:grid-cols-[284px_minmax(0,1fr)]',
        folded && 'lg:grid-cols-[68px_minmax(0,1fr)]',
      )}
    >
      {mobileOpen && (
        <div
          className="bg-scrim fixed inset-0 z-100 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Farmer navigation"
        className={Helper.cn(
          'bg-board text-on-board fixed inset-y-0 left-0 z-100 flex w-71 -translate-x-full flex-col gap-4 overflow-y-auto p-3 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          mobileOpen && 'translate-x-0',
          folded && 'lg:w-17 lg:items-center lg:px-2',
        )}
      >
        <div className="flex items-center gap-2 px-2">
          <Link
            to="/farmer"
            aria-label="MarketLink — Farmer overview"
            className="text-on-board inline-flex items-center gap-2 no-underline"
          >
            <LogoMark size={26} />
            {!folded && <span className="font-hand text-xl leading-none">MarketLink</span>}
          </Link>
          {!folded && (
            <span className="bg-accent text-on-accent rounded-sm px-2 py-0.5 text-[11px] font-bold tracking-[0.08em] uppercase">
              Farmer
            </span>
          )}
          <button
            type="button"
            onClick={toggleFold}
            aria-label={folded ? 'Expand the sidebar' : 'Collapse the sidebar'}
            title={folded ? 'Expand the sidebar' : 'Collapse the sidebar'}
            className="text-board-muted hover:text-on-board hover:bg-brand-strong ml-auto hidden size-8 flex-none place-items-center rounded-sm lg:grid"
          >
            <FoldIcon />
          </button>
        </div>

        <div
          className={Helper.cn(
            'bg-brand-strong grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-md p-3 shadow-[inset_0_0_0_1.5px_var(--accent)]',
            folded && 'lg:grid-cols-1 lg:justify-items-center lg:p-2',
          )}
        >
          <span className="bg-accent text-on-accent font-hand grid size-9 place-items-center rounded-full text-[20px]">
            {f.stall.charAt(0)}
          </span>
          {!folded && (
            <span className="min-w-0">
              <b className="font-hand block truncate text-[21px] leading-tight font-normal">{f.stall}</b>
              <span className="text-board-muted block text-[12px]">Approved · {f.markets.length} markets</span>
            </span>
          )}
          {!folded && (
            <button
              type="button"
              aria-label="Change which market you are looking at"
              className="text-on-board hover:bg-board grid size-8 place-items-center rounded-sm"
            >
              <SwapIcon />
            </button>
          )}
        </div>

        {nav}

        <div className="border-board-muted grid grid-cols-[36px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 border-t pt-3">
          <span className="bg-board-muted text-board grid size-9 place-items-center rounded-full text-[13px] font-bold">
            CT
          </span>
          {!folded && (
            <span className="min-w-0">
              <b className="block truncate text-[13px] font-medium">cotu@example.com</b>
              <span className="text-board-muted block text-[12px]">Farmer · Cô Tư Garden</span>
            </span>
          )}
          <Link
            to="/login"
            className={Helper.cn(
              'text-board-muted hover:text-on-board hover:bg-brand-strong col-span-2 inline-flex min-h-9 items-center gap-2 rounded-sm px-3 text-[14px] font-bold no-underline',
              folded && 'lg:col-span-1 lg:justify-center lg:px-0',
            )}
          >
            <LogOutIcon />
            {!folded && 'Sign out'}
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="border-line-strong bg-surface-quiet sticky top-0 z-40 flex items-center gap-3 border-b-[1.5px] px-4 py-3 md:px-5">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            className="border-line-strong bg-surface-raised text-ink grid size-10 flex-none place-items-center rounded-sm border-[1.5px] lg:hidden"
          >
            <MenuIcon />
          </button>
          {showBack && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="border-line-strong bg-surface-raised text-ink hover:border-ink hidden size-10 flex-none place-items-center rounded-sm border-[1.5px] sm:grid"
            >
              <ChevronLeftIcon />
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <div className="border-line-strong bg-surface-raised text-ink-muted focus-within:outline-focus hidden min-h-10 items-center gap-2 rounded-sm border-[1.5px] px-3 focus-within:outline-2 focus-within:outline-offset-1 sm:flex">
              <SearchIcon />
              <label htmlFor="farmer-appq" className="sr-only">
                Search
              </label>
              <input
                id="farmer-appq"
                type="search"
                placeholder="Order code or customer"
                className="text-ink w-47.5 bg-transparent text-[14px] outline-none"
              />
              <kbd className="bg-surface-sunken text-ink-muted rounded-[4px] px-1.5 py-0.5 text-[11px] font-bold">
                ⌘K
              </kbd>
            </div>
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
            <Link
              to="/account"
              aria-label="Your account"
              className="bg-brand text-on-brand grid size-10 flex-none place-items-center rounded-full text-[13px] font-bold no-underline"
            >
              CT
            </Link>
          </div>
        </header>

        <main className="mx-auto box-border flex w-full max-w-300 flex-1 flex-col gap-6 px-4 pt-6 pb-8 md:px-6 md:pt-8 md:pb-12">
          <Outlet />
        </main>

        <footer className="border-line text-ink-muted mt-auto flex flex-wrap justify-between gap-3 border-t px-4 py-4 text-[12px] md:px-6">
          <span>© 2026 MarketLink · TechWiz 7</span>
          <span>Map data © OpenStreetMap contributors</span>
        </footer>
      </div>
    </div>
  );
};

export default FarmerLayout;
