import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';
import Avatar from '@/components/Avatar';
import { Button } from '@/components/ui/button';
import type { NavItem } from '@/constants/nav';
import type { Tier } from '@/types/achievement.types';

type MenuMobileProps = {
  items: NavItem[];
  /** The signed-in person, shown at the top of the drawer. */
  account?: { name: string; email?: string; avatarUrl?: string; tier?: Tier };
  onClose: () => void;
  onSignOut?: () => void;
};

/** Slide-in drawer for screens below 768px. */
const MenuMobile = ({ items, account, onClose, onSignOut }: MenuMobileProps) => {
  const { t } = useTranslation();
  return (
    <div className="bg-scrim fixed inset-0 z-100" onClick={onClose}>
      <div
        role="dialog"
        aria-label={t('header.menu')}
        className="bg-board text-on-board absolute inset-y-0 right-0 flex w-75 max-w-[85vw] flex-col gap-2 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <Button variant="onboard" size="sm" className="self-end" onClick={onClose}>
          {t('actions.close')}
        </Button>
        {account && (
          <div className="border-board-muted mb-1 flex items-center gap-3 border-b px-3 pb-4">
            <Avatar
              name={account.name}
              email={account.email}
              url={account.avatarUrl}
              size={44}
              tone="accent"
              tier={account.tier}
              className="[--tier-gap:var(--board)]"
            />
            <div className="min-w-0">
              <p className="truncate text-[17px] font-bold">{account.name}</p>
              {account.email && <p className="text-small text-board-muted truncate">{account.email}</p>}
            </div>
          </div>
        )}
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className="text-on-board block rounded-sm p-3 text-[17px] font-bold no-underline aria-[current=page]:shadow-[inset_4px_0_0_var(--accent)]"
          >
            {t(`nav.${item.label}`)}
          </NavLink>
        ))}
        {onSignOut && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onSignOut();
            }}
            className="text-on-board block cursor-pointer rounded-sm bg-transparent p-3 text-left text-[17px] font-bold"
          >
            {t('nav.signOut')}
          </button>
        )}
      </div>
    </div>
  );
};

export default MenuMobile;
