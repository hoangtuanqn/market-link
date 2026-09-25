import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router';
import Helper from '@/utils/helper';

type Variant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'onboard' | 'danger' | 'dangerFill';
type Size = 'md' | 'sm';

const base =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-sm font-sans leading-none font-bold whitespace-nowrap no-underline transition-[background-color,box-shadow] duration-100 disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-muted disabled:shadow-none aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:bg-surface-sunken aria-disabled:text-ink-muted aria-disabled:shadow-none motion-reduce:transition-none';

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-on-brand hover:bg-brand-strong',
  secondary:
    'bg-surface-raised text-ink shadow-[inset_0_0_0_1.5px_var(--line-strong)] hover:shadow-[inset_0_0_0_2px_var(--ink)]',
  accent: 'bg-accent text-on-accent hover:bg-accent-strong',
  ghost: 'bg-transparent text-brand underline-offset-4 hover:underline',
  onboard: 'bg-transparent text-on-board shadow-[inset_0_0_0_1.5px_var(--board-muted)]',
  danger: 'bg-surface-raised text-danger shadow-[inset_0_0_0_1.5px_var(--danger)] hover:bg-danger-bg',
  // `.ml-btn-danger-fill`: nút xác nhận của hộp thoại nguy hiểm. Design system không đặt hover cho nó.
  dangerFill: 'bg-danger text-on-danger',
};

const sizes: Record<Size, string> = {
  md: 'min-h-11 text-[15px]',
  sm: 'min-h-9 text-small',
};

type StyleProps = { variant?: Variant; size?: Size; className?: string };

function buttonClass({ variant = 'primary', size = 'md', className }: StyleProps) {
  const padding = variant === 'ghost' ? 'px-2' : size === 'sm' ? 'px-3' : 'px-4';
  return Helper.cn(base, variants[variant], sizes[size], padding, className);
}

export function Button({
  variant,
  size,
  className,
  type = 'button',
  ...rest
}: StyleProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={buttonClass({ variant, size, className })} {...rest} />;
}

/** Internal route rendered as a button. */
export function ButtonLink({ variant, size, className, ...rest }: StyleProps & LinkProps) {
  return <Link className={buttonClass({ variant, size, className })} {...rest} />;
}

/** External URL rendered as a button, opened in a new tab. */
export function ButtonAnchor({
  variant,
  size,
  className,
  ...rest
}: StyleProps & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a target="_blank" rel="noopener noreferrer" className={buttonClass({ variant, size, className })} {...rest} />
  );
}
