const W = 84;
const H = 26;

/** Tiny trend line for a KPI tile (design system `.pt-kpi-spark` / prototype `PT.sparkline`). */
const Sparkline = ({ values }: { values: number[] }) => {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const rng = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (W - 6) + 3;
    const y = H - 3 - ((v - min) / rng) * (H - 8);
    return [x, y] as const;
  });
  const path = `M${points.map(([x, y]) => `${x} ${y}`).join(' L')}`;
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
      <path d={path} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r={3} fill="currentColor" />
    </svg>
  );
};

export default Sparkline;
