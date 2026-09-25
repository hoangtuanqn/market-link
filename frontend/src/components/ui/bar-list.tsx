import i18n from '@/i18n';
export type BarRow = { label: string; value: number; suffix?: string };

type BarListProps = { rows: BarRow[]; format?: (v: number) => string };

/** Horizontal bar chart, one measure across categories (design system `.pt-bars`). */
export function BarList({ rows, format = (v) => v.toLocaleString(i18n.language) }: BarListProps) {
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <ul className="m-0 flex flex-col gap-3 p-0">
      {rows.map((r) => (
        <li
          key={r.label}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-[14px] sm:grid-cols-[140px_minmax(0,1fr)_auto]"
        >
          <span className="truncate">{r.label}</span>
          <span className="bg-surface-sunken border-line relative col-span-2 h-3 overflow-hidden rounded-[6px] shadow-[inset_0_0_0_1px_var(--line)] sm:col-span-1">
            <span
              className="bg-brand absolute inset-y-0 left-0 rounded-[6px]"
              style={{ width: `${Math.round((r.value / max) * 100)}%` }}
            />
          </span>
          <span className="font-bold whitespace-nowrap tabular-nums">
            {format(r.value)} {r.suffix && <span className="text-ink-muted font-normal">{r.suffix}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
