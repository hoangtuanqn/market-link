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
        'text-small inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full px-3.5 font-medium whitespace-nowrap',
        // The two looks are exclusive rather than layered: Helper.cn only joins strings, so leaving the resting
        // background in place lets whichever utility Tailwind emits last win instead of the one asked for.
        pressed
          ? 'bg-brand text-on-brand'
          : 'bg-surface-raised text-ink shadow-[inset_0_0_0_1.5px_var(--line-strong)] hover:shadow-[inset_0_0_0_1.5px_var(--ink)]',
        className,
      )}
      {...rest}
    />
  );
}
