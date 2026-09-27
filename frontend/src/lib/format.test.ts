import { describe, expect, it } from 'vitest';
import { cutoffLabel, formatDate, formatTime, pickupLabel } from './format';

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
