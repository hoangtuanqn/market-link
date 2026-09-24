import { useState } from 'react';
import { Link } from 'react-router';
import { GUEST_NAV } from '@/constants/nav';
import { CartIcon, MenuIcon, SearchIcon } from '@/components/icons';
import Logo from '@/components/Logo';
import { ButtonLink } from '@/components/ui/button';
import Helper from '@/utils/helper';
import MenuMobile from './MenuMobile';
import NavLink from './NavLink';

const iconButton =
  'relative grid size-11 cursor-pointer place-items-center rounded-sm bg-transparent text-on-board hover:shadow-[inset_0_0_0_1.5px_var(--board-muted)] [&_svg]:size-5.5';

const Header = ({ cartCount = 0 }: { cartCount?: number }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="bg-board text-on-board sticky top-0 z-40">
        <div className="mx-auto flex min-h-16 max-w-300 items-center gap-2 px-4 md:gap-6 md:px-6">
          <Logo to="/" />

          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex gap-1">
              {GUEST_NAV.map((item) => (
                <li key={item.to}>
                  <NavLink item={item} />
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <Link to="/search" aria-label="Search" className={Helper.cn(iconButton, 'max-md:hidden')}>
              <SearchIcon />
            </Link>
            <Link to="/cart" aria-label={cartCount ? `Cart, ${cartCount} items` : 'Cart'} className={iconButton}>
              <CartIcon />
              {cartCount > 0 && (
                <span
                  aria-hidden="true"
                  className="bg-accent text-on-accent absolute top-0.75 right-px grid h-4.5 min-w-4.5 place-items-center rounded-full px-1 text-[11px] font-bold tabular-nums"
                >
                  {cartCount}
                </span>
              )}
            </Link>
            <ButtonLink to="/login" variant="accent" size="sm">
              Sign in
            </ButtonLink>
            <button
              type="button"
              aria-label="Open menu"
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
          items={[...GUEST_NAV, { label: 'Sign in', to: '/login' }, { label: 'Create an account', to: '/register' }]}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </>
  );
};

export default Header;
