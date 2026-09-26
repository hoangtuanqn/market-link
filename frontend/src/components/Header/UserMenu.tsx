import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import Avatar from '@/components/Avatar';
import { DashboardIcon, LogOutIcon, ShieldIcon, SlidersIcon, StoreIcon, UsersIcon } from '@/components/icons';
import TierBadge from '@/components/TierBadge';
import { USER_ROLE } from '@/constants/enums';
import useSession from '@/hooks/useSession';
import type { Tier } from '@/types/achievement.types';
import type { RoleType } from '@/types/user.types';

type UserMenuProps = {
  name: string;
  email?: string;
  avatarUrl?: string;
  tier?: Tier;
  role?: RoleType;
  /** Trang Settings theo vai: Customer /settings, Farmer /farmer/settings. */
  settingsTo?: string;
  onSignOut: () => void;
};

const item =
  'text-ink hover:bg-surface-sunken focus-visible:bg-surface-sunken flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-sm bg-transparent px-3 text-left text-[15px] font-bold no-underline outline-none [&_svg]:size-4.5';

/**
 * The account button on the right of SiteHeader: image + name, click to open a Profile / Settings / Sign out menu (the
 * menu button pattern of WAI-ARIA: Esc or clicking outside closes it, up/down arrows move between items, Home/End go to
 * the first/last).
 */
const UserMenu = ({
  name,
  email,
  avatarUrl,
  tier,
  role: propRole,
  settingsTo = '/settings',
  onSignOut,
}: UserMenuProps) => {
  const { t } = useTranslation();
  const { user } = useSession();
  const userRole = propRole ?? user?.role;
  const isFarmer = userRole === USER_ROLE.FARMER;
  const isAdmin = userRole === USER_ROLE.ADMIN;
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const items = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  };

  // Opening by keyboard or mouse both put focus on the first item, so the arrow keys work right away
  useEffect(() => {
    if (open) items()[0]?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const onMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLElement);
    const move = (to: number) => {
      e.preventDefault();
      list[(to + list.length) % list.length]?.focus();
    };
    if (e.key === 'ArrowDown') move(index + 1);
    else if (e.key === 'ArrowUp') move(index - 1);
    else if (e.key === 'Home') move(0);
    else if (e.key === 'End') move(list.length - 1);
    else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Tab') close(false);
  };

  const onButtonKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
    }
  };

  return (
    <div ref={rootRef} className="relative ml-1 hidden md:block">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onButtonKeyDown}
        className="text-small text-board-muted border-board-muted hover:text-on-board flex min-h-11 cursor-pointer items-center gap-2 border-0 border-l-[1.5px] border-solid bg-transparent pr-1 pl-3"
      >
        <Avatar
          name={name}
          email={email}
          url={avatarUrl}
          size={32}
          tone="accent"
          tier={tier}
          className="[--tier-gap:var(--board)]"
        />
        <span>
          <Trans t={t} i18nKey="header.hi" values={{ name }} components={{ b: <b className="text-on-board" /> }} />
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`size-4 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={t('nav.yourAccount')}
          onKeyDown={onMenuKeyDown}
          className="bg-surface-raised text-ink border-line absolute top-[calc(100%+8px)] right-0 z-(--z-dropdown) flex w-60 flex-col gap-0.5 rounded-md border-[1.5px] p-1.5 shadow-(--shadow-pop)"
        >
          <div className="border-line mb-1 flex items-center gap-3 border-b px-3 pt-2 pb-3">
            <Avatar name={name} email={email} url={avatarUrl} size={40} tier={tier} />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold">{name}</p>
              {email && <p className="text-small text-ink-muted truncate">{email}</p>}
              {tier && <TierBadge tier={tier} className="mt-1" />}
            </div>
          </div>
          {isFarmer && (
            <Link role="menuitem" tabIndex={-1} to="/farmer" onClick={() => close(false)} className={item}>
              <StoreIcon /> {t('nav.farmerPanel')}
            </Link>
          )}
          {isAdmin && (
            <Link role="menuitem" tabIndex={-1} to="/admin" onClick={() => close(false)} className={item}>
              <ShieldIcon /> {t('nav.adminPanel')}
            </Link>
          )}
          <Link role="menuitem" tabIndex={-1} to="/dashboard" onClick={() => close(false)} className={item}>
            <DashboardIcon /> {t('nav.dashboard')}
          </Link>
          <Link role="menuitem" tabIndex={-1} to="/account" onClick={() => close(false)} className={item}>
            <UsersIcon /> {t('nav.profile')}
          </Link>
          <Link role="menuitem" tabIndex={-1} to={settingsTo} onClick={() => close(false)} className={item}>
            <SlidersIcon /> {t('nav.settings')}
          </Link>
          <button
            role="menuitem"
            tabIndex={-1}
            type="button"
            onClick={() => {
              close(false);
              onSignOut();
            }}
            className={item}
          >
            <LogOutIcon /> {t('nav.signOut')}
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
