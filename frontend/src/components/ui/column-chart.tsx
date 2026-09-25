import i18n from '@/i18n';
import Helper from '@/utils/helper';

export type ChartSeries = { name: string; values: number[]; compare?: boolean };

type ColumnChartProps = {
  labels: string[];
  series: ChartSeries[];
  format?: (v: number) => string;
  height?: number;
  caption: string;
};

const group = (n: number) => Math.round(n).toLocaleString(i18n.language);

/** Clamps a max value to a "nice" gridline top: 1/2/2.5/5/10 × a power of ten. */
function niceMax(v: number): number {
  if (!(v > 0)) return 1;
  const e = 10 ** Math.floor(Math.log10(v));
  const m = v / e;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * e;
}

/**
 * Inline SVG column chart, no library: a "now" series and an optional dashed-opacity "was" comparison (design system
 * `.pt-chart`, prototype `PT.chart`). Colours never carry meaning alone — the comparison series is also lower-opacity,
 * and every chart should sit next to a table of the same numbers.
 */
export function ColumnChart({ labels, series, format = group, height = 240, caption }: ColumnChartProps) {
  const PL = 60;
  const PR = 18;
  const PAD_T = 14;
  const PB = 30;
  const W = 640;
  const n = labels.length;
  const top = niceMax(Math.max(0, ...series.flatMap((s) => s.values)));
  const iw = W - PL - PR;
  const ih = height - PAD_T - PB;
  const y = (v: number) => PAD_T + ih * (1 - v / top);
  const band = iw / n;
  const gap = series.length > 1 ? 2 : 0;
  const gutter = Math.min(10, band * 0.25);
  const per = Math.min(24, Math.max(1, (band - gutter - (series.length - 1) * gap) / series.length));

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
        {[0, 1, 2, 3, 4].map((t) => {
          const gv = (top / 4) * t;
          const gy = y(gv);
          return (
            <g key={t}>
              <line x1={PL} y1={gy} x2={W - PR} y2={gy} stroke="var(--line)" strokeWidth={1} />
              <text x={PL - 10} y={gy + 4} textAnchor="end" className="fill-ink-muted text-[11px]">
                {format(gv)}
              </text>
            </g>
          );
        })}
        {series.map((s, si) =>
          s.values.map((v, i) => {
            const cx = PL + band * (i + 0.5);
            const w = per;
            const x0 = cx - (series.length * w + (series.length - 1) * gap) / 2 + si * (w + gap);
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
        )}
        {labels.map((lb, i) => (
          <text
            key={lb}
            x={PL + band * (i + 0.5)}
            y={height - 9}
            textAnchor="middle"
            className="fill-ink-muted text-[11px]"
          >
            {lb}
          </text>
        ))}
      </svg>
    </div>
  );
}
