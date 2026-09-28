import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FarmerProductsPage from './index';
import DealApi, { type FarmerDealDto } from '@/api-requests/deal.requests';
import ProductApi from '@/api-requests/product.requests';
import type { ProductType } from '@/types/product.types';

vi.mock('@/api-requests/product.requests', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/api-requests/product.requests')>();
  return {
    ...real,
    default: {
      mine: vi.fn(),
      setStatus: vi.fn(),
      remove: vi.fn(),
      overrideDailyStock: vi.fn(),
      mineDeleted: vi.fn(),
      restore: vi.fn(),
    },
  };
});
vi.mock('@/api-requests/deal.requests', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/api-requests/deal.requests')>();
  return { ...real, default: { mine: vi.fn(), remove: vi.fn(), pickupDays: vi.fn(), post: vi.fn() } };
});

const product = (id: number, name: string, nextDate?: string): ProductType => ({
  id,
  name,
  stall: 'Trứng gà Khánh Hòa',
  marketName: '',
  category: 'Eggs and dairy',
  price: 1.6,
  unit: 'tray',
  stock: 20,
  status: 'available',
  shelfLifeDays: 10,
  nextDate,
  nextLeft: nextDate ? 20 : undefined,
  nextReserved: nextDate ? 0 : undefined,
});

const onSale: FarmerDealDto = {
  productId: 1,
  productName: 'Trứng vịt',
  unit: 'tray',
  stockDate: '2026-10-03',
  quantityAvailable: 10,
  listPrice: 1.6,
  unitPrice: 1.28,
  discountPercent: 20,
  packedOn: '2026-09-27',
  bestBefore: '2026-10-06',
  daysLeft: 4,
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <FarmerProductsPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });
  vi.mocked(ProductApi.mine).mockResolvedValue([product(1, 'Trứng vịt', '2026-10-03'), product(2, 'Trứng gà ác')]);
  vi.mocked(ProductApi.mineDeleted).mockResolvedValue([]);
  vi.mocked(DealApi.mine).mockResolvedValue([onSale]);
  vi.mocked(DealApi.remove).mockResolvedValue(undefined);
  vi.mocked(DealApi.pickupDays).mockResolvedValue([]);
});

describe('FarmerProductsPage — near-expiry deals', () => {
  it('shows the days on sale and takes one off', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'On sale (1)' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove deal' }));

    expect(DealApi.remove).toHaveBeenCalledWith(1, '2026-10-03');
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'On sale (1)' })).not.toBeInTheDocument());
  });

  it('offers a deal only on products customers can still order', async () => {
    renderPage();

    await screen.findByRole('link', { name: 'Trứng gà ác' });
    expect(screen.getAllByRole('button', { name: /^Near-expiry deal/ })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Near-expiry deal for Trứng vịt' })).toHaveTextContent(
      'Near-expiry deal',
    );
    // Non-regression (drift D7): dev's FR-063 per-date Adjust button must survive the new column.
    expect(screen.getAllByRole('button', { name: 'Adjust' })).toHaveLength(1);
  });

  /** Every row has its own deal button, so each one needs a name that says which product it is for. */
  it('names each deal button after its product', async () => {
    vi.mocked(ProductApi.mine).mockResolvedValue([
      product(1, 'Trứng vịt', '2026-10-03'),
      product(3, 'Trứng cút', '2026-10-03'),
    ]);
    renderPage();

    expect(await screen.findByRole('button', { name: 'Near-expiry deal for Trứng vịt' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Near-expiry deal for Trứng cút' })).toBeInTheDocument();
  });

  it('opens the deal dialog for that product', async () => {
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Near-expiry deal for Trứng vịt' }));

    expect(await screen.findByRole('dialog', { name: 'Near-expiry deal · Trứng vịt' })).toBeInTheDocument();
  });
});

describe('FarmerProductsPage — not orderable yet', () => {
  /** FR-062/FR-063: a product on sale with no pickup day open (no weekly stock yet) says so and links to the fix. */
  it('points a product with no open pickup day to the weekly stock', async () => {
    renderPage();

    await screen.findByRole('link', { name: 'Trứng gà ác' });
    expect(screen.getByText('No day open to order')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Set weekly stock' })).toHaveAttribute('href', '/farmer/stock');
  });
});
