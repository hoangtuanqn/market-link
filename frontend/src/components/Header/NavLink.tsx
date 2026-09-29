import { useTranslation } from 'react-i18next';
import { NavLink as RouterNavLink } from 'react-router';
import type { NavItem } from '@/constants/nav';

const NavLink = ({ item }: { item: NavItem }) => {
  const { t } = useTranslation();
  return (
    <RouterNavLink
      to={item.to}
      data-tour={`header:${item.label}`}
      className="text-board-muted hover:text-on-board aria-[current=page]:text-on-board inline-flex min-h-16 items-center px-2 text-[15px] font-bold whitespace-nowrap no-underline aria-[current=page]:shadow-[inset_0_-4px_0_var(--accent)] xl:px-3"
    >
      {t(`nav.${item.label}`)}
    </RouterNavLink>
  );
};

export default NavLink;
