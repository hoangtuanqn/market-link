import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useLogout from '@/hooks/useLogout';
import { Link } from 'react-router';
import { CUSTOMER_NAV, GUEST_NAV, type NavItem } from '@/constants/nav';
import { BellIcon, CartIcon, ChatIcon, MenuIcon, SearchIcon } from '@/components/icons';
import Logo from '@/components/Logo';
import type { Tier } from '@/types/achievement.types';
import { ButtonLink } from '@/components/ui/button';
import Helper from '@/utils/helper';
import MenuMobile from './MenuMobile';
import NavLink from './NavLink';
import UserMenu from './UserMenu';

const iconButton =
  'relative grid size-11 cursor-pointer place-items-center rounded-sm bg-transparent text-on-board hover:shadow-[inset_0_0_0_1.5px_var(--board-muted)] [&_svg]:size-5.5';

const badge =
  'bg-accent text-on-accent absolute top-0.75 right-px grid h-4.5 min-w-4.5 place-items-center rounded-full px-1 text-[11px] font-bold tabular-nums';

type HeaderProps = {
  /** 'customer' also covers a Farmer away from their stall panel (README, "Two shells"). */
  variant?: 'guest' | 'customer';
  userName?: string;
  userEmail?: string;
  avatarUrl?: string;
  /** Hạng thành tích của chính mình: viền quanh ảnh trên header và drawer. */
  tier?: Tier;
  settingsTo?: string;
  /** Hộp thư theo vai: Customer /messages, Farmer /farmer/messages. */
  messagesTo?: string;
  /** Trang thông báo của vai đang đăng nhập (Farmer: /farmer/notifications). */
  notificationsTo?: string;
  cartCount?: number;
  unreadCount?: number;
};

const Header = ({
  variant = 'guest',
  userName = '',
  userEmail,
  avatarUrl,
  tier,
  settingsTo = '/settings',
  messagesTo = '/messages',
  notificationsTo = '/notifications',
  cartCount = 0,
  unreadCount = 0,
}: HeaderProps) => {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const logout = useLogout();
  const signedIn = variant === 'customer';
  const navItems = signedIn ? CUSTOMER_NAV : GUEST_NAV;
  const drawerItems: NavItem[] = signedIn
    ? [
        ...navItems,
        { label: 'messages', to: messagesTo },
        { label: 'profile', to: '/account' },
        { label: 'settings', to: settingsTo },
      ]
    : [...navItems, { label: 'signIn', to: '/login' }, { label: 'createAccount', to: '/register/customer' }];

  return (
    <>
      <header className="bg-board text-on-board sticky top-0 z-40">
        <div className="mx-auto flex min-h-16 max-w-(--size-container) items-center gap-2 px-4 md:gap-6 md:px-6">
          <Logo to="/" />

          <nav aria-label={t('header.main')} className="hidden md:block">
            <ul className="flex gap-1">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink item={item} />
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <Link to="/search" aria-label={t('header.search')} className={Helper.cn(iconButton, 'max-md:hidden')}>
              <SearchIcon />
            </Link>
            {/* Tin nhắn và thông báo là hai biểu tượng riêng, không gộp (spec chat §9.1) */}
            {signedIn && (
              <Link to={messagesTo} aria-label={t('header.messages')} className={iconButton}>
                <ChatIcon />
              </Link>
            )}
            {signedIn && (
              <Link
                to={notificationsTo}
                aria-label={
                  unreadCount ? t('header.notificationsUnread', { count: unreadCount }) : t('header.notifications')
                }
                className={iconButton}
              >
                <BellIcon />
                {unreadCount > 0 && (
                  <span aria-hidden="true" className={badge}>
                    {unreadCount}
                  </span>
                )}
              </Link>
            )}
            <Link
              to="/cart"
              aria-label={cartCount ? t('header.cartItems', { count: cartCount }) : t('header.cart')}
              className={iconButton}
            >
              <CartIcon />
              {cartCount > 0 && (
                <span aria-hidden="true" className={badge}>
                  {cartCount}
                </span>
              )}
            </Link>
            {signedIn ? (
              <UserMenu
                name={userName}
                email={userEmail}
                avatarUrl={avatarUrl}
                tier={tier}
                settingsTo={settingsTo}
                onSignOut={logout}
              />
            ) : (
              <ButtonLink to="/login" variant="accent" size="sm">
                {t('nav.signIn')}
              </ButtonLink>
            )}
            <button
              type="button"
              aria-label={t('header.openMenu')}
              onClick={() => setMenuOpen(true)}
              className={Helper.cn(iconButton, 'md:hidden')}
            >
              <MenuIcon />
            </button>
          </div>
        </div>
        <div aria-hidden="true" className="border-twine h-0 border-t-2 border-dashed" />
      </header>

      {menuOpen && (
        <MenuMobile
          items={drawerItems}
          account={signedIn ? { name: userName, email: userEmail, avatarUrl, tier } : undefined}
          onClose={() => setMenuOpen(false)}
          onSignOut={signedIn ? logout : undefined}
        />
      )}
    </>
  );
};

export default Header;
