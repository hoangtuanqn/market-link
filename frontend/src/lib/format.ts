/** Formatting helpers that follow the MarketLink design system (docs/design-system/README.md → Voice). */

const UNIT_SAME = new Set(['kg', 'g', 'dozen']);

/** 25000 → "25,000 ₫" */
export function vnd(amount: number): string {
  return `${Math.round(amount).toLocaleString('en-US')}\u00a0₫`;
}

/** English plural for a sale unit: (3, 'bunch') → "3 bunches", (2, 'loaf') → "2 loaves", (1, 'kg') → "1 kg" */
export function units(count: number, unit?: string): string {
  if (!unit) return String(count);
  if (count === 1 || UNIT_SAME.has(unit)) return `${count} ${unit}`;
  if (unit === 'loaf') return `${count} loaves`;
  if (/(ch|sh|s|x)$/.test(unit)) return `${count} ${unit}es`;
  if (/[^aeiou]y$/.test(unit)) return `${count} ${unit.slice(0, -1)}ies`;
  return `${count} ${unit}s`;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Date → "26/09/2026" (dd/MM/yyyy, D-locale) */
export function formatDate(date: Date): string {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** Date → "07:30" (24-hour) */
export function formatTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Date → "Sat" */
export function weekday(date: Date): string {
  return WEEKDAYS[date.getDay()];
}
