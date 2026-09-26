import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import Helper from '@/utils/helper';

type Props = {
  label: string;
  trigger: ReactNode;
  /** The full page; the panel always has a "See all" link to it (a phone cannot hover). */
  to: string;
  children: ReactNode;
  buttonClassName?: string;
};

/**
 * The header's popover (spec §9.1): hover **and** click/keyboard, Esc or clicking outside closes it, `aria-expanded` on
 * the button. Panel `shadow-pop`, `z-50` — above the header (`z-40`).
 */
export function Popover({ label, trigger, to, children, buttonClassName }: Props) {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Open because the mouse hovered in: clicking the icon at that point leaves it open, does not close it
  const hovering = useRef(false);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Moving the mouse from the button to the panel crosses a small gap: wait one beat before closing
  const enter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    hovering.current = true;
    setOpen(true);
  };
  const leave = () => {
    hovering.current = false;
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <div
      ref={root}
      className="relative flex items-center"
      onPointerEnter={(e) => e.pointerType === 'mouse' && enter()}
      onPointerLeave={(e) => e.pointerType === 'mouse' && leave()}
    >
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => (hovering.current ? true : !v))}
        className={buttonClassName}
      >
        {trigger}
      </button>
      {open ? (
        <div
          id={panelId}
          className="bg-surface-raised text-ink shadow-pop border-line-strong absolute top-full right-0 z-50 mt-2 w-80 max-w-[calc(100vw-32px)] rounded-md border p-2"
        >
          {children}
          <Link
            to={to}
            onClick={() => setOpen(false)}
            className={Helper.cn('text-brand block p-2 text-center font-sans font-semibold')}
          >
            {t('header.seeAll')}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
