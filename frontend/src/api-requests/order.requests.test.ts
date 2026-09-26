import { describe, expect, it } from 'vitest';
import type { OrderDetailDto } from './order.requests';
import { toOrder, toOrderView } from './order.requests';

const baseDto = (overrides: Partial<OrderDetailDto> = {}): OrderDetailDto => ({
  summary: {
    orderId: 42,
    orderCode: 'ML-20260926-0001',
    status: 'placed',
    farmerId: 7,
    stallName: 'Cô Tư Garden',
    marketId: 3,
    marketName: 'Thảo Điền Weekend Market',
    pickupDate: '2026-09-28',
    pickupStart: '07:00',
    pickupEnd: '07:30',
    cutoffAt: '2026-09-27T12:00:00Z',
    totalAmount: 150000,
    itemCount: 2,
    createdAt: '2026-09-26T08:00:00Z',
  },
  items: [
    { productId: 1, productName: 'Tomato', unit: 'kg', unitPrice: 25000, quantity: 2, subtotal: 50000 },
    { productId: 2, productName: 'Lettuce', unit: 'bunch', unitPrice: 10000, quantity: 3, subtotal: 30000 },
  ],
  statusHistory: [
    {
      fromStatus: null,
      toStatus: 'placed',
      changedAt: '2026-09-26T08:00:00Z',
      note: null,
      changedByName: null,
      changedByRole: null,
    },
  ],
  canCancel: true,
  canModify: true,
  customerNote: null,
  farmerNote: null,
  ...overrides,
});

describe('toOrder', () => {
  it('maps summary, items and slot from the detail dto', () => {
    const order = toOrder(baseDto());

    expect(order.code).toBe('ML-20260926-0001');
    expect(order.farmerId).toBe(7);
    expect(order.marketId).toBe(3);
    expect(order.date).toBe('2026-09-28');
    expect(order.slot).toBe('07:00–07:30');
    expect(order.status).toBe('placed');
    expect(order.cutoff).toBe('2026-09-27T12:00:00Z');
    expect(order.items).toEqual([
      { productId: 1, qty: 2 },
      { productId: 2, qty: 3 },
    ]);
    expect(order.reviewed).toBeUndefined();
  });

  it('is locked while placed/accepted and cancellation is no longer allowed', () => {
    const placedLocked = toOrder(baseDto({ canCancel: false }));
    expect(placedLocked.locked).toBe(true);

    const accepted = baseDto({
      summary: { ...baseDto().summary, status: 'accepted' },
      canCancel: false,
    });
    expect(toOrder(accepted).locked).toBe(true);

    const stillCancellable = toOrder(baseDto({ canCancel: true }));
    expect(stillCancellable.locked).toBe(false);
  });

  it('is not locked for statuses outside placed/accepted even without canCancel', () => {
    const completed = baseDto({
      summary: { ...baseDto().summary, status: 'completed' },
      canCancel: false,
    });

    expect(toOrder(completed).locked).toBe(false);
  });

  it('carries the farmer note as the reason only when the order was declined', () => {
    const declined = toOrder(
      baseDto({ summary: { ...baseDto().summary, status: 'declined' }, farmerNote: 'Out of pomelo today.' }),
    );
    expect(declined.reason).toBe('Out of pomelo today.');

    const placedWithNote = toOrder(baseDto({ farmerNote: 'Ignored note.' }));
    expect(placedWithNote.reason).toBeUndefined();
  });

  it('keeps status history in the order the backend returned it, defaulting an empty actor name', () => {
    const order = toOrder(
      baseDto({
        statusHistory: [
          {
            fromStatus: null,
            toStatus: 'placed',
            changedAt: '2026-09-26T08:00:00Z',
            note: null,
            changedByName: null,
            changedByRole: null,
          },
          {
            fromStatus: 'placed',
            toStatus: 'accepted',
            changedAt: '2026-09-26T09:00:00Z',
            note: null,
            changedByName: 'Nguyễn Thị Tư',
            changedByRole: 'farmer',
          },
        ],
      }),
    );

    expect(order.history).toEqual([
      ['placed', '2026-09-26T08:00:00Z', ''],
      ['accepted', '2026-09-26T09:00:00Z', 'Nguyễn Thị Tư'],
    ]);
  });
});

describe('toOrderView', () => {
  it('carries the numeric order id alongside the same OrderType toOrder would build (I-1)', () => {
    const dto = baseDto();

    const view = toOrderView(dto);

    expect(view.id).toBe(42);
    expect(view.id).toBe(dto.summary.orderId);
    expect(view.order).toEqual(toOrder(dto));
  });
});
