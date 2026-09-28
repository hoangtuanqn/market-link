import { describe, expect, it } from 'vitest';
import type { SlotDto } from '@/api-requests/stall.requests';
import { NO_CHOICE, pickupOf, todayInHcmc } from './pickup';

/** A 07:00 slot at a market; `full` takes every place. */
const at = (marketId: number, slotDate: string, full = false): SlotDto => ({
  slotId: marketId * 100 + Number(slotDate.slice(-2)),
  farmerMarketId: marketId,
  marketId,
  slotDate,
  startTime: '07:00',
  endTime: '08:00',
  maxOrders: 5,
  bookedCount: full ? 5 : 0,
  isFull: full,
  isActive: true,
});

describe('pickupOf', () => {
  it('falls back to the next deal day when the first one is gone everywhere', () => {
    const p = pickupOf([at(1, '2026-10-02', true), at(2, '2026-10-03')], NO_CHOICE, ['2026-10-02', '2026-10-03']);

    expect(p).toMatchObject({ marketId: 2, pricedDay: '2026-10-03', goneDealDays: ['2026-10-02'] });
  });

  it('prices the first free day of a market the customer chose without the deal day', () => {
    const p = pickupOf([at(1, '2026-10-01'), at(1, '2026-10-02'), at(2, '2026-09-30')], { ...NO_CHOICE, marketId: 1 }, [
      '2026-09-30',
    ]);

    expect(p).toMatchObject({ marketId: 1, days: ['2026-10-01', '2026-10-02'], pricedDay: '2026-10-01' });
    // Another market still offers it, so the deal day is not gone
    expect(p.goneDealDays).toEqual([]);
  });

  it('shows a fully booked day that was clicked but keeps pricing the last free one', () => {
    const slots = [at(1, '2026-10-01'), at(1, '2026-10-02', true)];
    const p = pickupOf(slots, { ...NO_CHOICE, marketId: 1, date: '2026-10-01', shown: '2026-10-02' }, []);

    expect(p).toMatchObject({ shownDay: '2026-10-02', pricedDay: '2026-10-01' });
  });

  it('drops a picked day that has filled up since', () => {
    const slots = [at(1, '2026-10-01', true), at(1, '2026-10-02')];
    const p = pickupOf(slots, { ...NO_CHOICE, marketId: 1, date: '2026-10-01', shown: '2026-10-01' }, []);

    expect(p).toMatchObject({ shownDay: '2026-10-01', pricedDay: '2026-10-02' });
  });

  it('has no market and no day for a stall without slots', () => {
    expect(pickupOf([], NO_CHOICE, ['2026-10-01'])).toMatchObject({
      marketId: null,
      days: [],
      shownDay: null,
      pricedDay: null,
      goneDealDays: ['2026-10-01'],
    });
  });
});

describe('todayInHcmc', () => {
  it('writes the date in Ho Chi Minh City, seven hours ahead of UTC', () => {
    expect(todayInHcmc(new Date('2026-09-30T16:59:00Z'))).toBe('2026-09-30');
    expect(todayInHcmc(new Date('2026-09-30T17:00:00Z'))).toBe('2026-10-01');
  });
});
