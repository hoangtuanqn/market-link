import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OrderPin from './OrderPin';
import { formatClock, formatDate, money } from '@/lib/format';
import { fetchOrderSummary } from '@/lib/chat/orderSummary';

vi.mock('@/lib/chat/orderSummary', () => ({ fetchOrderSummary: vi.fn() }));
const session = vi.hoisted(() => ({ user: { id: 7, role: 'customer' } as { id: number; role: string } }));
vi.mock('@/hooks/useSession', () => ({ default: () => session }));

const summary = {
  orderId: 21,
  orderCode: 'ML-0421',
  status: 'accepted' as const,
  farmerId: 30,
  stallName: 'Cô Tư Garden',
  marketName: 'Thảo Điền Weekend Market',
  pickupDate: '2026-09-27',
  pickupStart: '07:00',
  pickupEnd: '07:30',
  totalAmount: 56000,
};

const renderPin = () =>
  render(
    <MemoryRouter>
      <OrderPin orderId={21} />
    </MemoryRouter>,
  );

describe('OrderPin', () => {
  beforeEach(() => {
    vi.mocked(fetchOrderSummary).mockResolvedValue(summary);
    session.user = { id: 7, role: 'customer' };
  });

  it('shows the order code, the pickup day and window, and the total', async () => {
    renderPin();

    expect(await screen.findByText(/ML-0421/)).toBeInTheDocument();
    // pickupDate is a date without a time: build the Date in local time, not new Date('yyyy-MM-dd') (UTC shift)
    expect(screen.getByText(new RegExp(formatDate(new Date(2026, 8, 27))))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${formatClock('07:00')}.*${formatClock('07:30')}`))).toBeInTheDocument();
    expect(screen.getByText(money(56000))).toBeInTheDocument();
  });

  it('links a customer to their order', async () => {
    renderPin();

    expect(await screen.findByRole('link')).toHaveAttribute('href', '/orders/ML-0421');
  });

  it('links the stall to the order in its own panel', async () => {
    session.user = { id: 3, role: 'farmer' };
    renderPin();

    expect(await screen.findByRole('link')).toHaveAttribute('href', '/farmer/orders/ML-0421');
  });

  /** Review Focus #4: the order can no longer be read (403/404/network) — a fallback line, the bubble stays intact. */
  it('says so when the order cannot be read', async () => {
    vi.mocked(fetchOrderSummary).mockRejectedValue(new Error('403'));
    renderPin();

    expect(await screen.findByText(/this order is not available/i)).toBeInTheDocument();
  });
});
