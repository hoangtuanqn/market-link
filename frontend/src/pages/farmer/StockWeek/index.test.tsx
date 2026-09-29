import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FarmerStockWeekPage from './index';
import ProductApi from '@/api-requests/product.requests';
import StockTemplateApi from '@/api-requests/stock-template.requests';
import type { ProductType } from '@/types/product.types';

vi.mock('@/api-requests/product.requests', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/api-requests/product.requests')>();
  return { ...real, default: { mine: vi.fn() } };
});
vi.mock('@/api-requests/stock-template.requests', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/api-requests/stock-template.requests')>();
  return { ...real, default: { list: vi.fn(), replace: vi.fn() } };
});

const eggs: ProductType = {
  id: 1,
  name: 'Trứng vịt',
  stall: 'Trứng gà Khánh Hòa',
  marketName: '',
  category: 'Eggs and dairy',
  price: 1.6,
  unit: 'tray',
  stock: 20,
  status: 'available',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ProductApi.mine).mockResolvedValue([eggs]);
  vi.mocked(StockTemplateApi.list).mockResolvedValue([]);
  vi.mocked(StockTemplateApi.replace).mockResolvedValue([]);
});

describe('FarmerStockWeekPage', () => {
  /** FR-063: a weekday's price must be above $0 (the server says 400); $0 used to be saved and sold for free. */
  it('asks for a price above $0 and saves nothing', async () => {
    render(
      <MemoryRouter>
        <FarmerStockWeekPage />
      </MemoryRouter>,
    );

    await userEvent.type(await screen.findByLabelText('Trứng vịt quantity on Saturday'), '10');
    const price = screen.getByLabelText('Trứng vịt price on Saturday');
    await userEvent.type(price, '0');
    await userEvent.click(screen.getByRole('button', { name: 'Save template' }));

    expect(
      await screen.findByText(
        'Enter a price above $0 for Trứng vịt on Saturday, or leave it blank to keep the current price.',
      ),
    ).toBeInTheDocument();
    expect(price).toHaveAttribute('aria-invalid', 'true');
    expect(StockTemplateApi.replace).not.toHaveBeenCalled();
  });

  it('saves a blank price as "keep the current price"', async () => {
    render(
      <MemoryRouter>
        <FarmerStockWeekPage />
      </MemoryRouter>,
    );

    await userEvent.type(await screen.findByLabelText('Trứng vịt quantity on Saturday'), '10');
    await userEvent.click(screen.getByRole('button', { name: 'Save template' }));

    expect(StockTemplateApi.replace).toHaveBeenCalledWith([
      { productId: 1, dayOfWeek: 6, defaultQuantity: 10, defaultPrice: null },
    ]);
  });
});
