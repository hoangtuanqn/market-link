import { useTranslation } from 'react-i18next';
import { Table } from '@/components/ui/table';
import i18n from '@/i18n';
import Helper from '@/utils/helper';

export type ChartSeries = { name: string; values: number[]; compare?: boolean };

type ColumnChartProps = {
  labels: string[];
  series: ChartSeries[];
  format?: (v: number) => string;
  height?: number;
  caption: string;
  /** `column` compares one period against another; `line` shows a trend over many points. */
  type?: 'column' | 'line';
  /**
   * Name of the x axis. Setting it also opens the collapsed table of the same numbers underneath, which is the only way
   * a reader who cannot see the chart gets at the figures.
   */
  axisLabel?: string;
};

const group = (n: number) => Math.round(n).toLocaleString(i18n.language);

/** Clamps a max value to a "nice" gridline top: 1/2/2.5/5/10 × a power of ten. */
function niceMax(v: number): number {
  if (!(v > 0)) return 1;
  const e = 10 ** Math.floor(Math.log10(v));
  const m = v / e;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * e;
}

const PL = 60;
const PR = 18;
const PAD_T = 14;
const PB = 30;
const W = 640;

/**
 * Inline SVG chart, no library: a "now" series and an optional dashed-opacity "was" comparison (design system
 * `.pt-chart`, prototype `PT.chart`). Colours never carry meaning alone — the comparison series is also lower-opacity
 * (dashed on a line), and every chart can show the table of the same numbers underneath.
 */
export function ColumnChart({
  labels,
  series,
  format = group,
  height = 240,
  caption,
  type = 'column',
  axisLabel,
}: ColumnChartProps) {
  const { t } = useTranslation();
  const n = labels.length;
  const top = niceMax(Math.max(0, ...series.flatMap((s) => s.values)));
  const iw = W - PL - PR;
  const ih = height - PAD_T - PB;
  const y = (v: number) => PAD_T + ih * (1 - v / top);
  const band = iw / n;
  const cx = (i: number) => PL + band * (i + 0.5);
  const gap = series.length > 1 ? 2 : 0;
  const gutter = Math.min(10, band * 0.25);
  const per = Math.min(24, Math.max(1, (band - gutter - (series.length - 1) * gap) / series.length));

  /* Thin the x labels so they never collide: every `step`th one, and never two closer than 56 units apart. */
  const step = Math.max(1, Math.ceil(n / Math.max(3, Math.floor(iw / 68))));
  const shownLabels: { i: number; text: string }[] = [];
  let lastDrawn = -99;
  labels.forEach((text, i) => {
    if (!(i % step === 0 || i === n - 1)) return;
    if ((i - lastDrawn) * band < 56) return;
    lastDrawn = i;
    shownLabels.push({ i, text });
  });

  const numbers = labels.map((label, i) => {
    const row: Record<string, string> = { l: label };
    series.forEach((s, si) => {
      row[`s${si}`] = format(s.values[i] ?? 0);
    });
    return row;
  });

  return (
    <div className="flex flex-col gap-3">
      {series.length > 1 && (
        <div className="flex flex-wrap gap-4 text-[13px]">
          {series.map((s) => (
            <span key={s.name} className="inline-flex items-center gap-1.5">
              <span
                className={Helper.cn(
                  'inline-block size-2.5 rounded-full',
                  s.compare ? 'bg-[var(--chart-was)] opacity-55' : 'bg-[var(--chart-now)]',
                )}
                aria-hidden="true"
              />
              {s.name}
            </span>
          ))}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} role="img" aria-label={caption}>
        {[0, 1, 2, 3, 4].map((tick) => {
          const gv = (top / 4) * tick;
          const gy = y(gv);
          return (
            <g key={tick}>
              <line x1={PL} y1={gy} x2={W - PR} y2={gy} stroke="var(--line)" strokeWidth={1} />
              <text x={PL - 10} y={gy + 4} textAnchor="end" className="fill-ink-muted text-[11px]">
                {format(gv)}
              </text>
            </g>
          );
        })}

        {type === 'column'
          ? series.map((s, si) =>
              s.values.map((v, i) => {
                const w = per;
                const x0 = cx(i) - (series.length * w + (series.length - 1) * gap) / 2 + si * (w + gap);
                const h = Math.max(0, ih * (v / top));
                const yy = PAD_T + ih - h;
                const r = Math.max(0, Math.min(4, w / 2, h));
                return (
                  <rect
                    key={`${si}-${i}`}
                    x={x0}
                    y={yy}
                    width={w}
                    height={h}
                    rx={r}
                    className={s.compare ? 'fill-[var(--chart-was)] opacity-55' : 'fill-[var(--chart-now)]'}
                  />
                );
              }),
            )
          : series.map((s) => {
              const points = s.values.map((v, i) => `${cx(i)} ${y(v)}`).join(' L');
              const stroke = s.compare ? 'var(--chart-was)' : 'var(--chart-now)';
              const last = s.values.length - 1;
              return (
                <g key={s.name}>
                  {!s.compare && (
                    <path
                      d={`M${PL} ${PAD_T + ih}L${points}L${W - PR} ${PAD_T + ih}Z`}
                      fill="var(--chart-now)"
                      fillOpacity={0.1}
                    />
                  )}
                  <path
                    d={`M${points}`}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={s.compare ? '6 5' : undefined}
                    opacity={s.compare ? 0.55 : 1}
                  />
                  {!s.compare && last >= 0 && (
                    <circle
                      cx={cx(last)}
                      cy={y(s.values[last])}
                      r={5}
                      fill={stroke}
                      stroke="var(--surface-raised)"
                      strokeWidth={2}
                    />
                  )}
                </g>
              );
            })}

        {shownLabels.map(({ i, text }) => (
          <text key={i} x={cx(i)} y={height - 9} textAnchor="middle" className="fill-ink-muted text-[11px]">
            {text}
          </text>
        ))}
      </svg>

      {axisLabel && (
        <details className="text-small">
          <summary className="text-brand cursor-pointer">{t('chart.showNumbers')}</summary>
          <div className="mt-3 overflow-x-auto">
            <Table
              columns={[
                { key: 'l', label: axisLabel },
                ...series.map((s, si) => ({ key: `s${si}`, label: s.name, align: 'num' as const })),
              ]}
              rows={numbers}
            />
          </div>
        </details>
      )}
    </div>
  );
}
