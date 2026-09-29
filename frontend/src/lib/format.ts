import SettingsStore from './settings';

const UNIT_SAME = new Set(['kg', 'g', 'dozen', 'lb', 'oz', 'l', 'ml', 'pt', 'fl oz']);

const settings = () => SettingsStore.get();
const locale = () => settings().language;

export function money(amount: number): string {
  return new Intl.NumberFormat(locale(), {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(amount);
}

const IMPERIAL: Record<string, { unit: string; factor: number }> = {
  kg: { unit: 'lb', factor: 2.20462 },
  g: { unit: 'oz', factor: 0.035274 },
  l: { unit: 'pt', factor: 2.11338 },
  litre: { unit: 'pt', factor: 2.11338 },
  liter: { unit: 'pt', factor: 2.11338 },
  ml: { unit: 'fl oz', factor: 0.033814 },
};

const imperialFor = (unit?: string) => (unit && settings().units === 'imperial' ? IMPERIAL[unit] : undefined);

function measure(count: number, unit?: string): { count: number; unit?: string } {
  const to = imperialFor(unit);
  if (!to) return { count, unit };
  return { count: Math.round(count * to.factor * 10) / 10, unit: to.unit };
}

export function unitName(unit: string): string {
  return imperialFor(unit)?.unit ?? unit;
}

export function perUnit(price: number, unit: string): string {
  const to = imperialFor(unit);
  return to ? `${money(price / to.factor)} / ${to.unit}` : `${money(price)} / ${unit}`;
}

export function unitPrice(price: number, unit?: string): { amount: number; unit?: string } {
  const to = imperialFor(unit);
  return to ? { amount: price / to.factor, unit: to.unit } : { amount: price, unit };
}

function guessPlural(unit: string): string {
  if (UNIT_SAME.has(unit)) return unit;
  if (unit === 'loaf') return 'loaves';
  if (/(ch|sh|s|x)$/.test(unit)) return `${unit}es`;
  if (/[^aeiou]y$/.test(unit)) return `${unit.slice(0, -1)}ies`;
  return `${unit}s`;
}

export function units(count: number, unit?: string, plural?: string): string {
  if (!unit) return new Intl.NumberFormat(locale()).format(count);
  const m = measure(count, unit);
  const n = new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(m.count);
  if (m.unit !== unit) return `${n} ${m.unit}`;
  if (count === 1 || UNIT_SAME.has(unit)) return `${n} ${unit}`;
  return `${n} ${plural || guessPlural(unit)}`;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function formatDate(date: Date): string {
  const d = pad(date.getDate());
  const m = pad(date.getMonth() + 1);
  const y = date.getFullYear();
  switch (settings().dateFormat) {
    case 'mdy':
      return `${m}/${d}/${y}`;
    case 'iso':
      return `${y}-${m}-${d}`;
    default:
      return `${d}/${m}/${y}`;
  }
}

export function formatDayMonth(date: Date): string {
  const d = pad(date.getDate());
  const m = pad(date.getMonth() + 1);
  switch (settings().dateFormat) {
    case 'mdy':
      return `${m}/${d}`;
    case 'iso':
      return `${m}-${d}`;
    default:
      return `${d}/${m}`;
  }
}

export function formatTime(date: Date): string {
  if (settings().clock === 'h24') return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return new Intl.DateTimeFormat(locale(), { hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
}

export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const d = new Date(2026, 0, 1, h, m);
  return formatTime(d);
}

const SUNDAY = new Date(2026, 0, 4);
const dayDate = (dow: number) => new Date(SUNDAY.getFullYear(), SUNDAY.getMonth(), SUNDAY.getDate() + dow);

export function dayName(dow: number, style: 'short' | 'long' = 'short'): string {
  return new Intl.DateTimeFormat(locale(), { weekday: style }).format(dayDate(dow));
}

export function weekday(date: Date): string {
  return dayName(date.getDay());
}

export function upcoming(dow: number, from: Date = new Date()): string {
  return formatDayMonth(upcomingDate(dow, from));
}

export function upcomingDate(dow: number, from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + ((dow - d.getDay() + 7) % 7));
  return d;
}

export function upcomingWeekend(from: Date = new Date()): { from: Date; to: Date } {
  const to = upcomingDate(0, from);
  const friday = new Date(to);
  friday.setDate(to.getDate() - 2);
  return { from: friday, to };
}

export function nextSevenDays(from: Date = new Date()): { dow: number; date: Date }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    return { dow: date.getDay(), date };
  });
}

export function firstOpenDay(isOpen: (dow: number) => boolean, from: Date = new Date()): number {
  return nextSevenDays(from).find((d) => isOpen(d.dow))?.dow ?? from.getDay();
}

export function nowLabel(date: Date): string {
  return `${weekday(date)} ${formatDayMonth(date)} · ${formatTime(date)}`;
}

export function dayList(days: number[]): string {
  return new Intl.ListFormat(locale(), { style: 'short', type: 'unit' }).format(
    [1, 2, 3, 4, 5, 6, 0].filter((d) => days.includes(d)).map((d) => dayName(d)),
  );
}

const localDay = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export function pickupLabel(date: string, slot: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return `${date} · ${slot}`;
  const d = localDay(date);
  return `${dayName(d.getDay())} ${formatDayMonth(d)} · ${slot.split('–').map(formatClock).join('–')}`;
}

export function cutoffLabel(iso: string): string {
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? iso : `${formatTime(at)} ${formatDate(at)}`;
}

export function foldText(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/đ/g, 'd');
}

export function matchesQuery(query: string, ...fields: (string | undefined)[]): boolean {
  const q = foldText(query.trim());
  return q === '' || fields.some((f) => f != null && foldText(f).includes(q));
}
