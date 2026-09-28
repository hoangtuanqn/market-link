import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FarmerProductFormPage from './index';
import CatalogApi from '@/api-requests/catalog.requests';
import ProductApi from '@/api-requests/product.requests';

vi.mock('@/api-requests/catalog.requests', () => ({ default: { listCategories: vi.fn() } }));
vi.mock('@/api-requests/product.requests', () => ({
  default: {
    getMine: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
    remove: vi.fn(),
    uploadProductImage: vi.fn(),
  },
}));

const renderNew = () =>
  render(
    <MemoryRouter initialEntries={['/farmer/products/new']}>
      <Routes>
        <Route path="/farmer/products/new" element={<FarmerProductFormPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.mocked(CatalogApi.listCategories).mockResolvedValue([
    { id: 1, name: 'Vegetables', slug: 'vegetables', minShelfLifeDays: 1, maxShelfLifeDays: 7 },
  ] as never);
  vi.mocked(ProductApi.create).mockReset();
});

describe('FarmerProductFormPage', () => {
  /** Prices are in USD (money() is locked to USD), so a Farmer has to be able to type cents. */
  it('keeps the decimal point while the price is typed', async () => {
    renderNew();
    const price = await screen.findByLabelText(/^Price/);

    await userEvent.type(price, '1.50');

    expect(price).toHaveValue('1.50');
    expect(screen.getByText(/Shown as \$1\.50/)).toBeInTheDocument();
  });

  /** A phone shows the keypad with a decimal point, not the digits-only one. */
  it('asks for the decimal keypad', async () => {
    renderNew();

    expect(await screen.findByLabelText(/^Price/)).toHaveAttribute('inputmode', 'decimal');
  });

  /** QA e2e round 3, bug 4: a minus sign stays in the field and saving shows the error instead of a silent 0. */
  it('keeps a negative price and quantity and refuses to save them', async () => {
    renderNew();
    const price = await screen.findByLabelText(/^Price/);
    const qty = screen.getByLabelText(/^Quantity/);

    await userEvent.type(price, '-1');
    await userEvent.type(qty, '-1');
    expect(price).toHaveValue('-1');
    expect(qty).toHaveValue('-1');

    await userEvent.click(screen.getByRole('button', { name: /Add product/ }));
    expect(screen.getByText('Price must be greater than 0.')).toBeInTheDocument();
    expect(screen.getByText(/Quantity must be 0 or more/)).toBeInTheDocument();
    expect(ProductApi.create).not.toHaveBeenCalled();
  });

  it('reads a comma as the decimal point', async () => {
    renderNew();
    const price = await screen.findByLabelText(/^Price/);

    await userEvent.type(price, '1,50');

    expect(screen.getByText(/Shown as \$1\.50/)).toBeInTheDocument();
  });
});
