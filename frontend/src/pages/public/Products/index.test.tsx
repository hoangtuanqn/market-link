import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CatalogApi from '@/api-requests/catalog.requests';
import ProductApi from '@/api-requests/product.requests';
import ProductsPage from './index';

vi.mock('@/api-requests/catalog.requests', () => ({
  default: { listMarkets: vi.fn(), listCategories: vi.fn() },
}));
vi.mock('@/api-requests/product.requests', () => ({
  default: { list: vi.fn() },
}));

const Address = () => <p data-testid="address">{useLocation().search}</p>;

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/products"
          element={
            <>
              <ProductsPage />
              <Address />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

describe('ProductsPage category filter (FR-020)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(CatalogApi.listMarkets).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 50 } as Awaited<
      ReturnType<typeof CatalogApi.listMarkets>
    >);
    vi.mocked(CatalogApi.listCategories).mockResolvedValue([
      { id: 3, name: 'Vegetables' },
      { id: 5, name: 'Fruit' },
    ] as Awaited<ReturnType<typeof CatalogApi.listCategories>>);
    vi.mocked(ProductApi.list).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 12 } as Awaited<
      ReturnType<typeof ProductApi.list>
    >);
  });

  it('starts filtered by the category in the address', async () => {
    renderAt('/products?category=3');

    await waitFor(() => expect(ProductApi.list).toHaveBeenCalledWith(expect.objectContaining({ categoryId: 3 })));
    expect(await screen.findByRole('button', { name: 'Vegetables' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps the address in step when the category changes', async () => {
    renderAt('/products?category=3');

    await userEvent.click(await screen.findByRole('button', { name: 'Fruit' }));

    expect(screen.getByTestId('address')).toHaveTextContent('?category=5');
    await waitFor(() => expect(ProductApi.list).toHaveBeenCalledWith(expect.objectContaining({ categoryId: 5 })));
  });
});
