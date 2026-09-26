import { useTranslation } from 'react-i18next';
import Helper from '@/utils/helper';

export type StockRow = { name: string; left: number; total: number };

/** Stock meter list: what's still sellable leads, the meter fills with what's reserved (design system `.pt-stock`). */
export function StockList({ rows }: { rows: StockRow[] }) {
  const { t } = useTranslation();
  return (
    <ul className="m-0 flex flex-col p-0">
      {rows.map((r) => {
        const reserved = r.total - r.left;
        const pct = Math.round((reserved / r.total) * 100);
        const level = r.left === 0 ? 'full' : r.left / r.total <= 0.25 ? 'warn' : 'ok';
        return (
          <li
            key={r.name}
            className="border-line flex flex-col gap-1.5 border-t py-3 first:border-t-0 first:pt-0 last:pb-0"
          >
            <div className="flex items-baseline justify-between gap-3">
              <b className="text-[15px]">{r.name}</b>
              <span
                className={Helper.cn(
                  'font-hand text-[26px] leading-none whitespace-nowrap tabular-nums',
                  level === 'warn' && 'text-warning-ink',
                  level === 'full' && 'text-danger',
                )}
              >
                {r.left}
                <span className="text-ink-muted ml-1 font-sans text-[13px]">{t('stock.left')}</span>
              </span>
            </div>
            <div className="bg-surface-sunken relative h-2.5 overflow-hidden rounded-full shadow-[inset_0_0_0_1px_var(--line)]">
              <span
                className={Helper.cn(
                  'absolute inset-y-0 left-0 rounded-full',
                  level === 'ok' && 'bg-brand',
                  level === 'warn' && 'bg-warning-ink',
                  level === 'full' && 'bg-danger',
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-ink-muted text-[13px] tabular-nums">
              {t('stock.reserved', { reserved, total: r.total })}
              {level === 'warn' ? ` · ${t('stock.runningLow')}` : level === 'full' ? ` · ${t('stock.soldOut')}` : ''}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
