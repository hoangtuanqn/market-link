import type { ReactNode } from 'react';
import Helper from '@/utils/helper';

type DataStateProps = {
  variant?: 'empty' | 'error';
  title: string;
  text: string;
  action?: ReactNode;
};

/** A block's empty or error state (design system `.ml-state`, FR-084). */
export function DataState({ variant = 'empty', title, text, action }: DataStateProps) {
  const error = variant === 'error';
  return (
    <div
      role={error ? 'alert' : undefined}
      className={Helper.cn(
        'flex max-w-105 min-w-65 flex-1 flex-col items-start gap-2 rounded-md p-6',
        error ? 'bg-danger-bg border-danger border-[1.5px]' : 'border-line-strong border-[1.5px] border-dashed',
      )}
    >
      <h3
        className={Helper.cn(
          'm-0 text-[17px] leading-tight font-bold',
          error ? 'text-danger' : 'font-hand text-[23px] leading-[1.15] font-normal',
        )}
      >
        {title}
      </h3>
      <p className={Helper.cn('m-0 text-[14px]', error ? 'text-danger' : 'text-ink-muted')}>{text}</p>
      {action}
    </div>
  );
}
