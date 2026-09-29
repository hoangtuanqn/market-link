import { useEffect, useId, useRef, type ReactNode } from 'react';

type DialogProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  actions: ReactNode;
  tone?: 'danger';
  onClose: () => void;
};

export function Dialog({ open, title, children, actions, tone, onClose }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      role={tone === 'danger' ? 'alertdialog' : 'dialog'}
      aria-labelledby={titleId}
      onClose={onClose}
      className="ml-dialog backdrop:bg-ink/40 text-ink m-auto max-w-[calc(100%-32px)] border-0 [&:not([open])]:hidden"
    >
      <h2 id={titleId} className="ml-dialog-title">
        {title}
      </h2>
      <div className="ml-dialog-body">{children}</div>
      <div className="ml-dialog-actions">{actions}</div>
    </dialog>
  );
}
