import { NavLink as RouterNavLink } from 'react-router';
import type { NavItem } from '@/constants/nav';

/** Desktop nav link: muted on the board, accent underline on the current page. */
const NavLink = ({ item }: { item: NavItem }) => {
  return (
    <RouterNavLink
      to={item.to}
      className="text-board-muted hover:text-on-board aria-[current=page]:text-on-board inline-flex min-h-16 items-center px-3 text-[15px] font-bold no-underline aria-[current=page]:shadow-[inset_0_-4px_0_var(--accent)]"
    >
      {item.label}
    </RouterNavLink>
  );
};

export default NavLink;
