import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DealsPage from './index';
import CatalogApi from '@/api-requests/catalog.requests';
import DealApi, { type DealDto } from '@/api-requests/deal.requests';
import { Cart } from '@/lib/cart';
import { money } from '@/lib/format';

vi.mock('@/api-requests/deal.requests', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/api-requests/deal.requests')>();
  return { ...real, default: { list: vi.fn() } };
});
vi.mock('@/api-requests/catalog.requests', () => ({ default: { listCategories: vi.fn(), listMarkets: vi.fn() } }));

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

const page = (items: DealDto[]) => ({ items, page: 1, pageSize: 12, total: items.length });

const renderPage = () =>
  render(
    <MemoryRouter>
      <DealsPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  Cart.clear();
  vi.mocked(CatalogApi.listCategories).mockResolvedValue([{ id: 2, name: 'Fruits' }] as never);
  vi.mocked(CatalogApi.listMarkets).mockResolvedValue({ items: [], page: 1, pageSize: 50, total: 0 } as never);
  vi.mocked(DealApi.list).mockReset();
});

describe('DealsPage', () => {
  it('shows a loading state first', () => {
    vi.mocked(DealApi.list).mockReturnValue(new Promise(() => undefined));
    renderPage();

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows each deal with both prices, its pickup day and until when it stays good', async () => {
    vi.mocked(DealApi.list).mockResolvedValue(page([tomato]));
    renderPage();

    expect(await screen.findByRole('link', { name: 'Cà chua bi' })).toHaveAttribute('href', '/products/7');
    expect(screen.getByText('−20%')).toBeInTheDocument();
    expect(screen.getByText(money(0.48))).toBeInTheDocument();
    expect(screen.getByText(money(0.6))).toBeInTheDocument();
    expect(screen.getByText('Pick up Sat 03/10 · good until end of Mon 05/10 · 12 kg left')).toBeInTheDocument();
    expect(screen.getByText('Nông trại Hoa Đà Lạt · Chợ Bà Chiểu')).toBeInTheDocument();
  });

  it('keeps the heading levels in order', async () => {
    vi.mocked(DealApi.list).mockResolvedValue(page([tomato]));
    renderPage();

    expect(await screen.findByRole('heading', { level: 3, name: 'Cà chua bi' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Near-expiry deals' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Deals you can still order' })).toBeInTheDocument();
  });

  it('adds a deal to the cart for its pickup day', async () => {
    vi.mocked(DealApi.list).mockResolvedValue(page([tomato]));
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Add to cart' }));

    expect(Cart.lines()).toEqual([
      expect.objectContaining({ productId: 7, price: 0.48, max: 12, farmerId: 3, pickupDate: '2026-10-03' }),
    ]);
  });

  it('says there is no deal today', async () => {
    vi.mocked(DealApi.list).mockResolvedValue(page([]));
    renderPage();

    expect(await screen.findByText('No deals today')).toBeInTheDocument();
  });

  it('offers to try again when the deals do not load', async () => {
    vi.mocked(DealApi.list).mockRejectedValue(new Error('network'));
    renderPage();

    expect(await screen.findByText('We could not load the deals')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('asks the server for one category', async () => {
    vi.mocked(DealApi.list).mockResolvedValue(page([tomato]));
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Fruits' }));

    await waitFor(() =>
      expect(DealApi.list).toHaveBeenLastCalledWith({ categoryId: 2, marketId: undefined, page: 1, pageSize: 12 }),
    );
  });
});
