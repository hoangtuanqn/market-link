import { useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  ChevronLeftIcon,
  FoldIcon,
  LogOutIcon,
  LogoMark,
  MenuIcon,
  SearchIcon,
  SwapIcon,
  type IconProps,
} from '@/components/icons';
import Helper from '@/utils/helper';

export type ShellNavItem = { to: string; label: string; icon: ComponentType<IconProps>; count?: number };
export type ShellNavGroup = { heading: string; items: ShellNavItem[] };

type DashboardShellProps = {
  /** "Farmer" / "Admin" — the tag next to the logo. Callers pass translated text for every label below. */
  badge: string;
  /** Accessible names of the sidebar and of the logo link. */
  navLabel: string;
  homeLabel: string;
  /** Sidebar home; its nav item only matches the exact path. */
  home: string;
  nav: ShellNavGroup[];
  /** The stall or platform card under the logo. */
  context: { mono: string; name: string; sub: string };
  user: { mono: string; email: string; line: string };
  /** Real sign-out (admin); without it the link just goes to `signOutTo`. */
  onSignOut?: () => void;
  signOutTo?: string;
  searchId: string;
  searchPlaceholder: string;
  accountTo: string;
  /** Extra header buttons before the avatar (e.g. the Farmer's notifications bell). */
  headerActions?: ReactNode;
  className?: string;
};

const FOLD_KEY = 'pt-side';

/**
 * Dashboard shell shared by the Farmer and Admin panels (docs/prototype/prototype.js "Dashboard shell"): board-green
 * sidebar with grouped navigation, the stall/platform context at the top, the signed-in person at the bottom, and a
 * quiet work-area header. The prototype flags this as a design-system deviation from the single SiteHeader.
 */
const DashboardShell = ({
  badge,
  navLabel,
  homeLabel,
  home,
  nav,
  context,
  user,
  onSignOut,
  signOutTo = '/login',
  searchId,
  searchPlaceholder,
  accountTo,
  headerActions,
  className,
}: DashboardShellProps) => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [folded, setFolded] = useState(() => {
    try {
      return localStorage.getItem(FOLD_KEY) === 'folded';
    } catch {
      return false; // private window
    }
  });
  // Drawer (mobile) chỉ mở trên trang đã bấm mở nó — chuyển trang là tự đóng, không cần effect.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const mobileOpen = openedOn === pathname;
  const setMobileOpen = (open: boolean) => setOpenedOn(open ? pathname : null);

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

  // A back arrow only makes sense on screens opened from a list, not on the sidebar's own destinations.
  const topLevel = useMemo(() => new Set(nav.flatMap((g) => g.items.map((i) => i.to))), [nav]);
  const showBack = !topLevel.has(pathname);

  const signOutClass = Helper.cn(
    'text-board-muted hover:text-on-board hover:bg-brand-strong col-span-2 inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-sm bg-transparent px-3 text-[14px] font-bold no-underline',
    folded && 'lg:col-span-1 lg:justify-center lg:px-0',
  );

  return (
    <div
      className={Helper.cn(
        'grid min-h-screen flex-1 grid-cols-1 lg:grid-cols-[284px_minmax(0,1fr)]',
        folded && 'lg:grid-cols-[68px_minmax(0,1fr)]',
        className,
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
        aria-label={navLabel}
        className={Helper.cn(
          'bg-board text-on-board fixed inset-y-0 left-0 z-100 flex w-71 -translate-x-full flex-col gap-4 overflow-y-auto p-3 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          mobileOpen && 'translate-x-0',
          folded && 'lg:w-17 lg:items-center lg:px-2',
        )}
      >
        <div className="flex items-center gap-2 px-2">
          <Link to={home} aria-label={homeLabel} className="text-on-board inline-flex items-center gap-2 no-underline">
            <LogoMark size={26} />
            {!folded && <span className="font-hand text-xl leading-none">MarketLink</span>}
          </Link>
          {!folded && (
            <span className="bg-accent text-on-accent rounded-sm px-2 py-0.5 text-[11px] font-bold tracking-[0.08em] uppercase">
              {badge}
            </span>
          )}
          <button
            type="button"
            onClick={toggleFold}
            aria-label={folded ? t('farmerNav.expand') : t('farmerNav.collapse')}
            title={folded ? t('farmerNav.expand') : t('farmerNav.collapse')}
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
            {context.mono}
          </span>
          {!folded && (
            <span className="min-w-0">
              <b className="font-hand block truncate text-[21px] leading-tight font-normal">{context.name}</b>
              <span className="text-board-muted block text-[12px]">{context.sub}</span>
            </span>
          )}
          {!folded && (
            <button
              type="button"
              aria-label={t('farmerNav.changeMarket')}
              className="text-on-board hover:bg-board grid size-8 place-items-center rounded-sm"
            >
              <SwapIcon />
            </button>
          )}
        </div>

        <nav aria-label={t('farmerNav.sections')} className="flex flex-1 flex-col gap-4">
          {nav.map((g) => (
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
                  end={it.to === home}
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
                        folded &&
                          'lg:absolute lg:top-0.5 lg:right-0.5 lg:ml-0 lg:h-4 lg:min-w-4 lg:px-1 lg:text-[10px]',
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

        <div className="border-board-muted grid grid-cols-[36px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 border-t pt-3">
          <span className="bg-board-muted text-board grid size-9 place-items-center rounded-full text-[13px] font-bold">
            {user.mono}
          </span>
          {!folded && (
            <span className="min-w-0">
              <b className="block truncate text-[13px] font-medium">{user.email}</b>
              <span className="text-board-muted block text-[12px]">{user.line}</span>
            </span>
          )}
          {onSignOut ? (
            <button type="button" onClick={onSignOut} className={signOutClass}>
              <LogOutIcon />
              {!folded && t('nav.signOut')}
            </button>
          ) : (
            <Link to={signOutTo} className={signOutClass}>
              <LogOutIcon />
              {!folded && t('nav.signOut')}
            </Link>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="border-line-strong bg-surface-quiet sticky top-0 z-40 flex items-center gap-3 border-b-[1.5px] px-4 py-3 md:px-5">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label={t('farmerNav.openNavigation')}
            className="border-line-strong bg-surface-raised text-ink grid size-10 flex-none place-items-center rounded-sm border-[1.5px] lg:hidden"
          >
            <MenuIcon />
          </button>
          {showBack && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label={t('actions.back')}
              className="border-line-strong bg-surface-raised text-ink hover:border-ink hidden size-10 flex-none place-items-center rounded-sm border-[1.5px] sm:grid"
            >
              <ChevronLeftIcon />
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <div className="border-line-strong bg-surface-raised text-ink-muted focus-within:outline-focus hidden min-h-10 items-center gap-2 rounded-sm border-[1.5px] px-3 focus-within:outline-2 focus-within:outline-offset-1 sm:flex">
              <SearchIcon />
              <label htmlFor={searchId} className="sr-only">
                {t('header.search')}
              </label>
              <input
                id={searchId}
                type="search"
                placeholder={searchPlaceholder}
                className="text-ink w-47.5 bg-transparent text-[14px] outline-none"
              />
              <kbd className="bg-surface-sunken text-ink-muted rounded-[4px] px-1.5 py-0.5 text-[11px] font-bold">
                ⌘K
              </kbd>
            </div>
            {headerActions}
            <Link
              to={accountTo}
              aria-label={t('nav.yourAccount')}
              className="bg-brand text-on-brand grid size-10 flex-none place-items-center rounded-full text-[13px] font-bold no-underline"
            >
              {user.mono}
            </Link>
          </div>
        </header>

        <main className="mx-auto box-border flex w-full max-w-300 flex-1 flex-col gap-6 px-4 pt-6 pb-8 md:px-6 md:pt-8 md:pb-12">
          <Outlet />
        </main>

        <footer className="border-line text-ink-muted mt-auto flex flex-wrap justify-between gap-3 border-t px-4 py-4 text-[12px] md:px-6">
          <span>© 2026 MarketLink · TechWiz 7</span>
          <span>{t('footer.mapData')}</span>
        </footer>
      </div>
    </div>
  );
};

export default DashboardShell;
