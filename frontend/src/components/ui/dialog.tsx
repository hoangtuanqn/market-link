import { useEffect, type ReactNode } from 'react';
import { Button } from './button';

type DialogProps = {
  title: string;
  children: ReactNode;
  tone?: 'default' | 'danger';
  keepLabel?: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => void;
};

/** Confirmation modal (design system `.ml-dialog`/`.ml-scrim`). Closes on Escape or a click on the scrim. */
export function Dialog({
  title,
  children,
  tone = 'default',
  keepLabel = 'Keep',
  confirmLabel = 'Confirm',
  onClose,
  onConfirm,
}: DialogProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="bg-scrim fixed inset-0 z-100 grid place-items-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role={tone === 'danger' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby="dlg-title"
        className="bg-surface-raised shadow-modal box-border flex w-115 max-w-full flex-col gap-3 rounded-lg p-5"
      >
        <h2 id="dlg-title" className="m-0 text-[20px] leading-tight font-bold">
          {title}
        </h2>
        <div className="text-[15px]">{children}</div>
        <div className="mt-2 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {keepLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'dangerFill' : 'primary'} onClick={onConfirm} autoFocus>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
