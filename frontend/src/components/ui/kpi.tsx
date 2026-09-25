import type { ReactNode } from 'react';
import { Link } from 'react-router';
import Sparkline from '@/components/Sparkline';
import { TrendDownIcon, TrendUpIcon } from '@/components/icons';
import Helper from '@/utils/helper';

type KpiDelta = { pct: number; vs?: string; good?: boolean; unit?: string };

type KpiProps = {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  delta?: KpiDelta;
  spark?: number[];
  href?: string;
  linkLabel?: string;
  highlight?: boolean;
};

/** Stat tile with a period-over-period delta and an optional trend line (design system `.ml-stat`). */
export function Kpi({ label, value, note, delta, spark, href, linkLabel, highlight }: KpiProps) {
  const vs = delta?.vs ?? 'vs the period before';
  let deltaEl: ReactNode = null;
  if (delta) {
    if (!delta.pct) {
      deltaEl = (
        <span className="text-ink-muted text-[13px] font-bold">
          no change <span className="font-normal">{vs}</span>
        </span>
      );
    } else {
      const up = delta.pct > 0;
      const good = delta.good ?? up;
      const Icon = up ? TrendUpIcon : TrendDownIcon;
      deltaEl = (
        <span
          className={Helper.cn(
            'group-hover:text-accent inline-flex items-center gap-1 text-[13px] font-bold',
            good ? 'text-brand' : 'text-danger',
          )}
        >
          <Icon size={14} />
          {up ? '+' : ''}
          {delta.pct}
          {delta.unit ?? '%'} <span className="font-normal opacity-80">{vs}</span>
        </span>
      );
    }
  }

  const className = Helper.cn(
    'group flex min-w-50 flex-col gap-1 rounded-md border-[1.5px] p-4 no-underline',
    highlight ? 'bg-board text-on-board border-board' : 'border-line-strong bg-surface-raised shadow-tag text-ink',
    href && !highlight && 'hover:bg-board hover:text-on-board hover:border-board transition-colors',
  );

  const content = (
    <>
      <span
        className={Helper.cn(
          'text-overline',
          highlight ? 'text-board-muted' : 'text-ink-muted group-hover:text-board-muted',
        )}
      >
        {label}
      </span>
      <span className="font-hand text-[48px] leading-[1.05] tabular-nums">{value}</span>
      {deltaEl}
      {note && (
        <span
          className={Helper.cn(
            'text-[13px] [&_b]:font-bold',
            highlight
              ? 'text-board-muted [&_b]:text-on-board'
              : 'text-ink-muted group-hover:text-board-muted [&_b]:text-ink group-hover:[&_b]:text-on-board',
          )}
        >
          {note}
        </span>
      )}
      {spark && (
        <span className={Helper.cn('mt-1', highlight ? 'text-accent' : 'text-brand group-hover:text-accent')}>
          <Sparkline values={spark} />
        </span>
      )}
      {href && <span className="sr-only">. {linkLabel ?? 'Open'}</span>}
    </>
  );

  return href ? (
    <Link to={href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
