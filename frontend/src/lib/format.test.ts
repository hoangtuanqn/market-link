import { describe, expect, it } from 'vitest';
import {
  cutoffLabel,
  firstOpenDay,
  foldText,
  formatDate,
  formatTime,
  matchesQuery,
  nextSevenDays,
  pickupLabel,
  upcomingDate,
  upcomingWeekend,
} from './format';

describe('pickupLabel', () => {
  it('formats an ISO pickup date and a slot as a weekday, day/month and clock range', () => {
    expect(pickupLabel('2026-09-26', '07:00–08:00')).toBe('Sat 26/09 · 07:00–08:00');
  });

  it('falls back to the raw date and slot when the date is not ISO', () => {
    expect(pickupLabel('next Saturday', '07:00–08:00')).toBe('next Saturday · 07:00–08:00');
  });
});

describe('cutoffLabel', () => {
  it('formats an ISO instant as the reader time then date', () => {
    const at = new Date('2026-09-27T12:00:00Z');
    expect(cutoffLabel('2026-09-27T12:00:00Z')).toBe(`${formatTime(at)} ${formatDate(at)}`);
  });

  it('falls back to the raw string when the instant cannot be parsed', () => {
    expect(cutoffLabel('not-a-date')).toBe('not-a-date');
  });
});

// Dates are built from local calendar parts, so these hold in any time zone the test runner is in.
describe('nextSevenDays', () => {
  it('returns today and the six days after it, at local midnight, with their weekdays', () => {
    const from = new Date(2026, 8, 27, 15, 30);
    const week = nextSevenDays(from);
    expect(week).toHaveLength(7);
    week.forEach(({ dow, date }, i) => {
      const expected = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
      expect(date.getTime()).toBe(expected.getTime());
      expect(dow).toBe(expected.getDay());
    });
    expect(week[0].dow).toBe(from.getDay());
  });

  it('covers every weekday once and rolls over the end of the month', () => {
    const week = nextSevenDays(new Date(2026, 8, 28));
    expect(new Set(week.map((d) => d.dow)).size).toBe(7);
    expect(week[6].date.getMonth()).toBe(9);
    expect(week[6].date.getDate()).toBe(4);
  });

  it('does not change the date it is given', () => {
    const from = new Date(2026, 8, 27, 9, 0);
    const before = from.getTime();
    nextSevenDays(from);
    expect(from.getTime()).toBe(before);
  });
});

describe('firstOpenDay', () => {
  const sunday = new Date(2026, 8, 27, 10, 0);
  const saturday = new Date(2026, 8, 26, 10, 0);

  it('picks today when the market is open today', () => {
    expect(firstOpenDay((d) => [0, 6].includes(d), sunday)).toBe(sunday.getDay());
  });

  it('picks the next open day, counting from today', () => {
    expect(firstOpenDay((d) => d === 6, sunday)).toBe(6);
    expect(firstOpenDay((d) => [1, 5].includes(d), saturday)).toBe(1);
  });

  it("falls back to today's weekday when no day is open", () => {
    expect(firstOpenDay(() => false, sunday)).toBe(sunday.getDay());
  });
});

describe('matchesQuery', () => {
  it('ignores case and Vietnamese accents, including đ', () => {
    expect(foldText('Rau Muống')).toBe('rau muong');
    expect(foldText('Đu đủ')).toBe('du du');
    expect(matchesQuery('rau muong', 'Rau muống')).toBe(true);
    expect(matchesQuery('ĐU', 'Đu đủ')).toBe(true);
    expect(matchesQuery('du du', 'Đu đủ')).toBe(true);
  });

  it('matches any of the fields and skips missing ones', () => {
    expect(matchesQuery('hien', undefined, 'Vườn Út Hiền')).toBe(true);
    expect(matchesQuery('xoai', 'Cam sành', undefined)).toBe(false);
  });

  it('matches everything when the query is blank', () => {
    expect(matchesQuery('', 'Cam sành')).toBe(true);
    expect(matchesQuery('   ', 'Cam sành')).toBe(true);
  });
});

/** Day chips and the home hero read dates from today, never from a fixed demo week. */
describe('upcomingDate', () => {
  const sunday = new Date(2026, 8, 27, 10, 0);

  it('is today when today is that weekday', () => {
    expect(upcomingDate(0, sunday).toDateString()).toBe(new Date(2026, 8, 27).toDateString());
  });

  it('is the next occurrence otherwise, even across a month end', () => {
    expect(upcomingDate(6, sunday).toDateString()).toBe(new Date(2026, 9, 3).toDateString());
    expect(upcomingDate(4, sunday).toDateString()).toBe(new Date(2026, 9, 1).toDateString());
  });
});

describe('upcomingWeekend', () => {
  it('is the coming Friday to Sunday on a weekday', () => {
    const { from, to } = upcomingWeekend(new Date(2026, 8, 28, 9, 0)); // Monday
    expect(from.toDateString()).toBe(new Date(2026, 9, 2).toDateString());
    expect(to.toDateString()).toBe(new Date(2026, 9, 4).toDateString());
  });

  it('is the weekend under way on a Saturday or Sunday', () => {
    const { from, to } = upcomingWeekend(new Date(2026, 8, 27, 9, 0)); // Sunday
    expect(from.toDateString()).toBe(new Date(2026, 8, 25).toDateString());
    expect(to.toDateString()).toBe(new Date(2026, 8, 27).toDateString());
  });
});
