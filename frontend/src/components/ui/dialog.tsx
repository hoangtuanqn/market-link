import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from './button';

type DialogProps = {
  title: string;
  children: ReactNode;
  tone?: 'default' | 'danger';
  onClose: () => void;
  /** Mặc định true: nơi gọi có thể render có điều kiện (`{x && <Dialog …/>}`) hoặc điều khiển bằng `open`. */
  open?: boolean;
  /** Nút tuỳ ý (vd. nút submit một form trong dialog). Không truyền thì dùng cặp Keep / Confirm bên dưới. */
  actions?: ReactNode;
  keepLabel?: string;
  confirmLabel?: string;
  onConfirm?: () => void;
};

/**
 * Confirmation modal (design system Dialog.md). Native `<dialog>` + showModal(): trình duyệt tự giữ focus bên trong,
 * Esc đóng, nền phía sau không bấm được; bấm ra vùng scrim cũng đóng.
 */
export function Dialog({
  title,
  children,
  tone = 'default',
  onClose,
  open = true,
  actions,
  keepLabel = 'Keep',
  confirmLabel = 'Confirm',
  onConfirm,
}: DialogProps) {
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
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="bg-surface-raised shadow-modal text-ink backdrop:bg-scrim m-auto box-border w-115 max-w-[calc(100%-32px)] flex-col gap-3 rounded-lg border-0 p-5 [&:not([open])]:hidden [&[open]]:flex"
    >
      <h2 id={titleId} className="m-0 text-[20px] leading-tight font-bold">
        {title}
      </h2>
      <div className="text-[15px]">{children}</div>
      <div className="mt-2 flex flex-wrap justify-end gap-2">
        {actions ?? (
          <>
            <Button variant="secondary" onClick={onClose}>
              {keepLabel}
            </Button>
            <Button variant={tone === 'danger' ? 'dangerFill' : 'primary'} onClick={onConfirm} autoFocus>
              {confirmLabel}
            </Button>
          </>
        )}
      </div>
    </dialog>
  );
}
