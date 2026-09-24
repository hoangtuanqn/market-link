import type { ButtonHTMLAttributes } from 'react';
import Helper from '@/utils/helper';

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & { pressed?: boolean };

/** Pill toggle button (design system `.ml-chip`). */
export function Chip({ pressed, className, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={Helper.cn(
        'text-small bg-surface-raised text-ink inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 font-medium whitespace-nowrap shadow-[inset_0_0_0_1.5px_var(--line-strong)] hover:shadow-[inset_0_0_0_1.5px_var(--ink)]',
        pressed && 'bg-brand text-on-brand shadow-none',
        className,
      )}
      {...rest}
    />
  );
}
