/**
 * Formatting helpers that follow the MarketLink design system (docs/design-system/README.md → Voice), and the reader's
 * Settings (src/lib/settings.ts): language, date format, clock, currency shown next to ₫, metric or imperial. Every
 * page goes through these, so a setting changes the whole app in one place.
 */
import SettingsStore from './settings';

const UNIT_SAME = new Set(['kg', 'g', 'dozen', 'lb', 'oz', 'l', 'ml', 'pt', 'fl oz']);

const settings = () => SettingsStore.get();
/** BCP 47 tag for Intl: the interface language. */
const locale = () => settings().language;

/**
 * Reading-only conversion rates (VND per unit). Stalls are always paid in đồng; these are approximate and fixed on
 * RATES_DATE — check them before a release (there is no live rate source).
 */
export const RATES_DATE = '25/09/2026';
const RATES: Record<'USD' | 'EUR' | 'JPY', { vnd: number; digits: number }> = {
  USD: { vnd: 26_300, digits: 2 },
  EUR: { vnd: 30_800, digits: 2 },
  JPY: { vnd: 178, digits: 0 },
};

/** 25000 → "25,000 ₫" (grouping follows the language); with another currency chosen: "25,000 ₫ ≈ $0.95". */
export function vnd(amount: number): string {
  const base = `${new Intl.NumberFormat(locale(), { maximumFractionDigits: 0 }).format(Math.round(amount))}\u00a0₫`;
  const { currency } = settings();
  if (currency === 'VND') return base;
  const rate = RATES[currency];
  const converted = new Intl.NumberFormat(locale(), {
    style: 'currency',
    currency,
    maximumFractionDigits: rate.digits,
    minimumFractionDigits: rate.digits,
  }).format(amount / rate.vnd);
  return `${base} ≈\u00a0${converted}`;
}

/* ---------- units ---------- */

/** Metric unit → imperial unit and how many imperial units one metric unit is. Count units (bunch, tray) are absent. */
const IMPERIAL: Record<string, { unit: string; factor: number }> = {
  kg: { unit: 'lb', factor: 2.20462 },
  g: { unit: 'oz', factor: 0.035274 },
  l: { unit: 'pt', factor: 2.11338 },
  litre: { unit: 'pt', factor: 2.11338 },
  liter: { unit: 'pt', factor: 2.11338 },
  ml: { unit: 'fl oz', factor: 0.033814 },
};

const imperialFor = (unit?: string) => (unit && settings().units === 'imperial' ? IMPERIAL[unit] : undefined);

/** A measured quantity in the reader's units: (2, 'kg') → { count: 4.4, unit: 'lb' }. Count units pass through. */
export function measure(count: number, unit?: string): { count: number; unit?: string } {
  const to = imperialFor(unit);
  if (!to) return { count, unit };
  return { count: Math.round(count * to.factor * 10) / 10, unit: to.unit };
}

/** The unit word the reader sees: 'kg' → 'lb' when imperial. */
export function unitName(unit: string): string {
  return imperialFor(unit)?.unit ?? unit;
}

/** Price per sale unit in the reader's units: (45000, 'kg') → "45,000 ₫ / kg", or "20,412 ₫ / lb". */
export function perUnit(price: number, unit: string): string {
  const to = imperialFor(unit);
  return to ? `${vnd(price / to.factor)} / ${to.unit}` : `${vnd(price)} / ${unit}`;
}

/** The price of one sale unit converted like `perUnit`, for components that lay the number and the unit out apart. */
export function unitPrice(price: number, unit?: string): { amount: number; unit?: string } {
  const to = imperialFor(unit);
  return to ? { amount: price / to.factor, unit: to.unit } : { amount: price, unit };
}

/**
 * English cannot derive the plural of an arbitrary unit phrase ("tray of 30" → "trays of 30"), so this is only the
 * guess a form offers by default; a stall can override it (see `units`' third argument).
 */
export function guessPlural(unit: string): string {
  if (UNIT_SAME.has(unit)) return unit;
  if (unit === 'loaf') return 'loaves';
  if (/(ch|sh|s|x)$/.test(unit)) return `${unit}es`;
  if (/[^aeiou]y$/.test(unit)) return `${unit.slice(0, -1)}ies`;
  return `${unit}s`;
}

/**
 * Quantity with its sale unit, in the reader's units: (3, 'bunch') → "3 bunches", (2, 'kg') → "2 kg" or "4.4 lb". Unit
 * words are the stall's own and stay as written. Pass the stall's plural (e.g. "trays of 30") as the third argument
 * when the unit doesn't just take an "s".
 */
export function units(count: number, unit?: string, plural?: string): string {
  if (!unit) return new Intl.NumberFormat(locale()).format(count);
  const m = measure(count, unit);
  const n = new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(m.count);
  if (m.unit !== unit) return `${n} ${m.unit}`;
  if (count === 1 || UNIT_SAME.has(unit)) return `${n} ${unit}`;
  return `${n} ${plural || guessPlural(unit)}`;
}

/* ---------- dates and times (Asia/Ho_Chi_Minh wall clock, D-locale) ---------- */

const pad = (n: number) => String(n).padStart(2, '0');

/** Date → "26/09/2026", "09/26/2026" or "2026-09-26" (Settings → Date). */
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

/** Day and month without the year, in the same order: "26/09", "09/26" or "09-26". */
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

/** Date → "07:30", or "7:30 PM" in the reader's language (Settings → Clock). */
export function formatTime(date: Date): string {
  if (settings().clock === 'h24') return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  // am/pm words and their place follow the language: "7:30 PM", "7:30 CH", "午後7:30"
  return new Intl.DateTimeFormat(locale(), { hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
}

/** "07:00" (a stall's slot or opening hour, always stored 24-hour) → "07:00" or "7:00 am". */
export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const d = new Date(2026, 0, 1, h, m);
  return formatTime(d);
}

/** A Sunday, so day 0…6 map straight onto dates. */
const SUNDAY = new Date(2026, 0, 4);
const dayDate = (dow: number) => new Date(SUNDAY.getFullYear(), SUNDAY.getMonth(), SUNDAY.getDate() + dow);

/** Weekday name in the interface language: (6) → "Sat" / "T7" / "土"; `long` → "Saturday". */
export function dayName(dow: number, style: 'short' | 'long' = 'short'): string {
  return new Intl.DateTimeFormat(locale(), { weekday: style }).format(dayDate(dow));
}

/** Date → "Sat" in the interface language */
export function weekday(date: Date): string {
  return dayName(date.getDay());
}

/**
 * The next date a weekday falls on, counted from today; today itself counts. (6) → "26/09". Day chips show the weekday
 * and reveal this on hover, so you can see which market morning you are actually picking.
 */
export function upcoming(dow: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + ((dow - d.getDay() + 7) % 7));
  return formatDayMonth(d);
}

/** Date → "Thu 24/09 · 14:35" */
export function nowLabel(date: Date): string {
  return `${weekday(date)} ${formatDayMonth(date)} · ${formatTime(date)}`;
}

/** [5, 6, 0] → "Fri, Sat, Sun" (Monday first, interface language) */
export function dayList(days: number[]): string {
  return new Intl.ListFormat(locale(), { style: 'short', type: 'unit' }).format(
    [1, 2, 3, 4, 5, 6, 0].filter((d) => days.includes(d)).map((d) => dayName(d)),
  );
}
