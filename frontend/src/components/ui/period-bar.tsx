import { useState } from 'react';
import Helper from '@/utils/helper';
import { Card } from './card';

const GRANULARITIES = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'quarter', label: 'Quarter' },
  { id: 'year', label: 'Year' },
  { id: 'custom', label: 'Custom' },
] as const;

type PeriodBarProps = {
  from?: string;
  to?: string;
  label: string;
  days: string;
  compare: string;
};

/** Period length, the two dates, and what it is compared against (design system `.pt-period`). */
export function PeriodBar({ from = '2026-09-01', to = '2026-09-30', label, days, compare }: PeriodBarProps) {
  const [granularity, setGranularity] = useState<(typeof GRANULARITIES)[number]['id']>('month');

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div role="tablist" aria-label="Period length" className="bg-surface-sunken flex gap-0.5 rounded-sm p-0.75">
        {GRANULARITIES.map((g) => (
          <button
            key={g.id}
            type="button"
            role="tab"
            aria-selected={granularity === g.id}
            onClick={() => setGranularity(g.id)}
            className={Helper.cn(
              'min-h-9 flex-1 rounded-[3px] bg-transparent text-[14px] font-bold whitespace-nowrap',
              granularity === g.id ? 'bg-surface-raised shadow-tag text-ink' : 'text-ink-muted hover:text-ink',
            )}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pt-from" className="text-small font-bold">
            From
          </label>
          <input
            id="pt-from"
            type="date"
            defaultValue={from}
            className="border-line-strong bg-surface-raised min-h-11 rounded-sm border-[1.5px] px-3"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pt-to" className="text-small font-bold">
            To
          </label>
          <input
            id="pt-to"
            type="date"
            defaultValue={to}
            className="border-line-strong bg-surface-raised min-h-11 rounded-sm border-[1.5px] px-3"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pt-cmp" className="text-small font-bold">
            Compare with
          </label>
          <select id="pt-cmp" className="border-line-strong bg-surface-raised min-h-11 rounded-sm border-[1.5px] px-3">
            <option>The period before, same length</option>
            <option>The same period last year</option>
            <option>No comparison</option>
          </select>
        </div>
      </div>
      <p className="text-small m-0">
        <b>{label}</b> · {days}
        <span className="text-ink-muted">
          {' '}
          compared with <b>{compare}</b>, the same length
        </span>
      </p>
    </Card>
  );
}
