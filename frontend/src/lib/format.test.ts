import { describe, expect, it } from 'vitest';
import { cutoffLabel, formatDate, formatTime, pickupLabel, upcomingDate, upcomingWeekend } from './format';

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
