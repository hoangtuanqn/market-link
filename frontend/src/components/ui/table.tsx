import type { ReactNode } from 'react';
import Helper from '@/utils/helper';

export type TableColumn<T> = {
  key: string;
  label: string;
  align?: 'num' | 'actions';
  render?: (row: T) => ReactNode;
};

type TableProps<T> = {
  caption?: string;
  columns: TableColumn<T>[];
  rows: T[];
  rowClassName?: (row: T) => string | undefined;
};

/** Design system `.ml-table` — a bordered data table with numeric and action columns. */
export function Table<T extends Record<string, unknown>>({ caption, columns, rows, rowClassName }: TableProps<T>) {
  return (
    <div className="border-line-strong bg-surface-raised w-full overflow-x-auto rounded-md border-[1.5px]">
      <table className="w-full border-collapse text-[14px]">
        {caption && (
          <caption className="border-line-strong border-b-[1.5px] p-3 px-4 text-left text-[15px] font-bold">
            {caption}
          </caption>
        )}
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={Helper.cn(
                  'bg-surface-sunken text-ink-muted px-4 py-2.5 text-left text-[12px] font-bold tracking-[0.08em] whitespace-nowrap uppercase',
                  c.align === 'num' && 'text-right',
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={Helper.cn('hover:bg-surface-quiet', rowClassName?.(r))}>
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={Helper.cn(
                    'border-line border-t px-4 py-3 align-middle',
                    c.align === 'num' && 'text-right font-bold whitespace-nowrap tabular-nums',
                    c.align === 'actions' && 'text-right whitespace-nowrap',
                  )}
                >
                  {c.render ? c.render(r) : (r[c.key] as ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
