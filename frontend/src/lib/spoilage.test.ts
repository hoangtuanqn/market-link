import { describe, expect, it } from 'vitest';
import { canReportSpoilage, reportDeadline, spoiledOnChoices, todayInVietnam } from './spoilage';

/** The same numbers as SpoilagePolicyTest on the server (spec §9). */
describe('spoilage rules', () => {
  it('closes the window two days after the good-until date', () => {
    expect(reportDeadline('2026-10-05')).toBe('2026-10-07');
    expect(reportDeadline('2026-12-30')).toBe('2027-01-01');
  });

  const line = { itemId: 501, bestBefore: '2026-10-05', qualityReport: null };
  // A pickup well before every "today" used below, so it never masks the other scenarios under test.
  const pickupDate = '2026-10-01';

  it('offers the button on a completed order until the last day of the window', () => {
    expect(canReportSpoilage('completed', line, '2026-10-03', pickupDate)).toBe(true);
    expect(canReportSpoilage('completed', line, '2026-10-05', pickupDate)).toBe(true);
    expect(canReportSpoilage('completed', line, '2026-10-07', pickupDate)).toBe(true);
    expect(canReportSpoilage('completed', line, '2026-10-08', pickupDate)).toBe(false);
  });

  it('never offers it before completion, without a good-until date, without a line id, or twice', () => {
    expect(canReportSpoilage('ready', line, '2026-10-04', pickupDate)).toBe(false);
    expect(canReportSpoilage('completed', { ...line, bestBefore: null }, '2026-10-04', pickupDate)).toBe(false);
    expect(canReportSpoilage('completed', { ...line, itemId: undefined }, '2026-10-04', pickupDate)).toBe(false);
    expect(
      canReportSpoilage(
        'completed',
        { ...line, qualityReport: { id: 1, status: 'open', spoiledOn: '2026-10-04', problem: 'mold' } },
        '2026-10-04',
        pickupDate,
      ),
    ).toBe(false);
  });

  /** M-1: a farmer can mark an order complete before its own pickup day. The day select would then be empty. */
  it('hides the button when the order was completed before its own pickup day', () => {
    expect(canReportSpoilage('completed', line, '2026-10-04', '2026-10-06')).toBe(false);
    // The pickup day itself is fine: it is included in the "spoiled on" choices.
    expect(canReportSpoilage('completed', line, '2026-10-04', '2026-10-04')).toBe(true);
  });

  it('lists the days from pickup to today', () => {
    expect(spoiledOnChoices('2026-10-03', '2026-10-06')).toEqual([
      '2026-10-03',
      '2026-10-04',
      '2026-10-05',
      '2026-10-06',
    ]);
    expect(spoiledOnChoices('2026-10-06', '2026-10-06')).toEqual(['2026-10-06']);
    expect(spoiledOnChoices('2026-12-31', '2027-01-01')).toEqual(['2026-12-31', '2027-01-01']);
  });

  /** Review Focus #5: 20:00 UTC is already the next day in Ho Chi Minh City. */
  it('reads today on the Vietnam calendar, whatever the browser time zone', () => {
    expect(todayInVietnam(new Date('2026-10-07T20:00:00Z'))).toBe('2026-10-08');
    expect(todayInVietnam(new Date('2026-10-07T16:59:00Z'))).toBe('2026-10-07');
  });
});
