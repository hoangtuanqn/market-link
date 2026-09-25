import { useEffect, useRef, type ReactNode } from 'react';

type DialogProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  actions: ReactNode;
  tone?: 'danger';
  onClose: () => void;
};

/**
 * Confirmation dialog (design system `.ml-dialog`, Dialog.md). Native `<dialog>` + showModal(): trình duyệt tự giữ
 * focus bên trong, Esc đóng, nền phía sau không bấm được.
 */
export function Dialog({ open, title, children, actions, tone, onClose }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

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
      aria-labelledby="dialog-title"
      onClose={onClose}
      className="ml-dialog backdrop:bg-ink/40 text-ink m-auto max-w-[calc(100%-32px)] border-0 [&:not([open])]:hidden"
    >
      <h2 id="dialog-title" className="ml-dialog-title">
        {title}
      </h2>
      <div className="ml-dialog-body">{children}</div>
      <div className="ml-dialog-actions">{actions}</div>
    </dialog>
  );
}
