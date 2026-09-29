import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DealsStrip from './DealsStrip';
import DealApi, { type DealDto } from '@/api-requests/deal.requests';

vi.mock('@/api-requests/deal.requests', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/api-requests/deal.requests')>();
  return { ...real, default: { list: vi.fn() } };
});

const deal = (productId: number): DealDto => ({
  productId,
  name: `Deal ${productId}`,
  imageUrl: null,
  unit: 'kg',
  stallName: 'Trứng gà Khánh Hòa',
  farmerId: 8,
  marketNames: ['Chợ Tân Định'],
  stockDate: '2026-10-03',
  listPrice: 1.6,
  unitPrice: 1.28,
  discountPercent: 20,
  bestBefore: '2026-10-06',
  daysLeft: 4,
  quantityAvailable: 10,
  storageMode: 'room',
});

const renderStrip = () =>
  render(
    <MemoryRouter>
      <DealsStrip />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.mocked(DealApi.list).mockReset();
});

describe('DealsStrip', () => {
  it('shows up to four deals and links to all of them', async () => {
    vi.mocked(DealApi.list).mockResolvedValue({ items: [deal(1), deal(2)], page: 1, pageSize: 4, total: 2 });
    renderStrip();

    expect(await screen.findByRole('heading', { name: 'Near-expiry deals' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'All deals' })).toHaveAttribute('href', '/deals');
    expect(DealApi.list).toHaveBeenCalledWith({ pageSize: 4 });
  });

  it('shows nothing when there is no deal', async () => {
    vi.mocked(DealApi.list).mockResolvedValue({ items: [], page: 1, pageSize: 4, total: 0 });
    const { container } = renderStrip();

    await waitFor(() => expect(DealApi.list).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
