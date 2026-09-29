import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProductDeals from './ProductDeals';
import DealApi, { type DealDto } from '@/api-requests/deal.requests';
import { Cart } from '@/lib/cart';

vi.mock('@/api-requests/deal.requests', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/api-requests/deal.requests')>();
  return { ...real, default: { list: vi.fn() } };
});

const tomato: DealDto = {
  productId: 7,
  name: 'Cà chua bi',
  imageUrl: null,
  unit: 'kg',
  stallName: 'Nông trại Hoa Đà Lạt',
  farmerId: 3,
  marketNames: ['Chợ Bà Chiểu'],
  stockDate: '2026-10-03',
  listPrice: 0.6,
  unitPrice: 0.48,
  discountPercent: 20,
  bestBefore: '2026-10-05',
  daysLeft: 3,
  quantityAvailable: 12,
  storageMode: 'room',
};

// LoadError links to /feedback, so the block renders inside a router
const renderDeals = () =>
  render(
    <MemoryRouter>
      <ProductDeals productId={7} />
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  Cart.clear();
  vi.mocked(DealApi.list).mockReset();
});

describe('ProductDeals', () => {
  it('lists the pickup days on sale and adds one with its day', async () => {
    vi.mocked(DealApi.list).mockResolvedValue({ items: [tomato], page: 1, pageSize: 14, total: 1 });
    renderDeals();

    expect(await screen.findByRole('heading', { name: 'On sale for these pickup days' })).toBeInTheDocument();
    expect(screen.getByText('Sat 03/10 · −20%')).toBeInTheDocument();
    expect(
      screen.getByText('$0.48 / kg, was $0.60 / kg · good until end of Mon 05/10 · 12 kg left'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add for Sat 03/10' }));

    expect(DealApi.list).toHaveBeenCalledWith({ productId: 7, pageSize: 14 });
    expect(Cart.lines()).toEqual([
      expect.objectContaining({ productId: 7, price: 0.48, max: 12, pickupDate: '2026-10-03' }),
    ]);
  });

  it('shows nothing when the product is not on sale', async () => {
    vi.mocked(DealApi.list).mockResolvedValue({ items: [], page: 1, pageSize: 14, total: 0 });
    const { container } = renderDeals();

    await waitFor(() => expect(DealApi.list).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('offers to try again when the deals do not load', async () => {
    vi.mocked(DealApi.list).mockRejectedValue(new Error('network'));
    renderDeals();

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
