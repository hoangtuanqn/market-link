import { formatClock, formatDayMonth, weekday } from '@/lib/format';

/**
 * The seeded farmer orders (src/data/farmer.ts) carry pre-written English labels: "Sat 26/09", "07:00–07:30", "19:00
 * 25/09". Until the server sends real dates, these re-read them in the reader's language, date order and clock.
 * Anything that does not match is shown as it came.
 */
const YEAR = 2026;
const DAY_MONTH = /(\d{1,2})\/(\d{1,2})/;
const CLOCK = /\d{1,2}:\d{2}/g;
const TIME = /\d{1,2}:\d{2}/;

const dateOf = (text: string) => {
  const m = DAY_MONTH.exec(text);
  return m ? new Date(YEAR, Number(m[2]) - 1, Number(m[1])) : undefined;
};

/** "Sat 26/09" → "Sat 26/09" / "T7 26/09" / "土 26/09" */
export const marketDay = (label: string) => {
  const d = dateOf(label);
  return d ? `${weekday(d)} ${formatDayMonth(d)}` : label;
};

/** "07:00–07:30" → "7:00 am–7:30 am" on a 12-hour clock */
export const clockRange = (slot: string) => slot.replace(CLOCK, (hhmm) => formatClock(hhmm));

/** "19:00 25/09" → "19:00 25/09" / "7:00 pm 09/25" */
export const cutoffLabel = (cutoff: string) => {
  const d = dateOf(cutoff);
  const time = TIME.exec(cutoff)?.[0];
  return d && time ? `${formatClock(time)} ${formatDayMonth(d)}` : cutoff;
};
