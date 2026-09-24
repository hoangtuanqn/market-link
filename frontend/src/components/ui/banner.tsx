import type { ReactNode } from 'react';
import { InfoIcon } from '@/components/icons';
import Helper from '@/utils/helper';

type Variant = 'info' | 'warning' | 'danger';

const variants: Record<Variant, string> = {
  info: 'bg-info-bg text-info-ink',
  warning: 'bg-warning-bg text-warning-ink',
  danger: 'bg-danger-bg text-danger',
};

/** Status banner with an icon, a title and a line of text (design system `.ml-banner`). */
export function Banner({
  variant = 'info',
  title,
  children,
  className,
}: {
  variant?: Variant;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={Helper.cn('flex items-start gap-3 rounded-md px-4 py-3', variants[variant], className)}
    >
      <InfoIcon className="mt-0.5 flex-none" />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold">{title}</p>
        <p className="text-small mt-0.5">{children}</p>
      </div>
    </div>
  );
}
