import type { InputHTMLAttributes, ReactNode } from 'react';
import Helper from '@/utils/helper';

type CheckboxProps = InputHTMLAttributes<HTMLInputElement> & { children: ReactNode };

/** Consent-style checkbox with a custom box (design system `.ml-check`). */
export function Checkbox({ id, children, className, ...rest }: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={Helper.cn(
        'group relative inline-flex min-h-11 cursor-pointer items-start gap-2 pt-2.75 has-[:disabled]:cursor-not-allowed',
        className,
      )}
    >
      <input
        id={id}
        type="checkbox"
        className="peer absolute top-2.75 left-0 size-5.5 cursor-pointer opacity-0"
        {...rest}
      />
      <span
        aria-hidden="true"
        className="border-line-strong bg-surface-raised peer-checked:bg-brand peer-checked:border-brand peer-checked:text-on-brand peer-focus-visible:outline-focus peer-disabled:bg-surface-sunken peer-disabled:border-line grid size-5.5 flex-none place-items-center rounded-sm border-[1.5px] text-transparent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2"
      >
        <svg
          viewBox="0 0 16 16"
          width={14}
          height={14}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 8.5l3.2 3L13 4.5" />
        </svg>
      </span>
      <span className="peer-disabled:text-ink-muted text-[15px] leading-5.5">{children}</span>
    </label>
  );
}
