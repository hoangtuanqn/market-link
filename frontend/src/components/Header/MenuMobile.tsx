import { NavLink } from 'react-router';
import { Button } from '@/components/ui/button';
import type { NavItem } from '@/constants/nav';

type MenuMobileProps = { items: NavItem[]; onClose: () => void; onSignOut?: () => void };

/** Slide-in drawer for screens below 768px. */
const MenuMobile = ({ items, onClose, onSignOut }: MenuMobileProps) => {
  return (
    <div className="bg-scrim fixed inset-0 z-100" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Menu"
        className="bg-board text-on-board absolute inset-y-0 right-0 flex w-75 max-w-[85vw] flex-col gap-2 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <Button variant="onboard" size="sm" className="self-end" onClick={onClose}>
          Close
        </Button>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className="text-on-board block rounded-sm p-3 text-[17px] font-bold no-underline aria-[current=page]:shadow-[inset_4px_0_0_var(--accent)]"
          >
            {item.label}
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
            Sign out
          </button>
        )}
      </div>
    </div>
  );
};

export default MenuMobile;
