import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CatalogApi from '@/api-requests/catalog.requests';
import ProductApi from '@/api-requests/product.requests';
import StallApi from '@/api-requests/stall.requests';
import type { MarketType } from '@/types/market.types';
import type { ProductType } from '@/types/product.types';
import SearchPage from './index';

const page = <T,>(items: T[]) => ({ items, page: 1, pageSize: 50, total: items.length });

const market: MarketType = {
  id: 7,
  name: 'Chợ Bà Chiểu',
  address: '1 Bùi Hữu Nghĩa',
  area: 'Bình Thạnh',
  days: [0, 1, 2, 3, 4, 5, 6],
  open: '05:00',
  close: '11:00',
  lat: 10.8,
  lng: 106.7,
  stalls: 3,
};

const product: ProductType = {
  id: 31,
  name: 'Rau muống',
  stall: 'Vườn Út Hiền',
  marketName: 'Chợ Bà Chiểu',
  category: 'Rau củ',
  categoryId: 2,
  price: 0.8,
  unit: 'kg',
  stock: 20,
  status: 'available',
  farmerId: 4,
};

const searchFor = (q: string) =>
  render(
    <MemoryRouter initialEntries={[`/search?q=${encodeURIComponent(q)}&scope=all`]}>
      <SearchPage />
    </MemoryRouter>,
  );

describe('Search facets (FR-023)', () => {
  beforeEach(() => {
    vi.spyOn(CatalogApi, 'listCategories').mockResolvedValue([
      {
        id: 2,
        name: 'Rau củ',
        slug: 'rau-cu',
        sortOrder: 1,
        isActive: true,
        count: 0,
        minShelfLifeDays: 1,
        maxShelfLifeDays: 5,
      },
      {
        id: 3,
        name: 'Trái cây',
        slug: 'trai-cay',
        sortOrder: 2,
        isActive: true,
        count: 0,
        minShelfLifeDays: 2,
        maxShelfLifeDays: 9,
      },
    ]);
    vi.spyOn(CatalogApi, 'listMarkets').mockResolvedValue(page([market]));
    vi.spyOn(StallApi, 'list').mockResolvedValue(page([]) as never);
    vi.spyOn(ProductApi, 'list').mockResolvedValue(page([product]));
  });

  afterEach(() => vi.restoreAllMocks());

  it('sends the chosen category to the product list', async () => {
    searchFor('rau');
    await screen.findByText('Rau muống');

    await userEvent.selectOptions(screen.getByLabelText('Category'), '2');

    await waitFor(() => expect(ProductApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ categoryId: 2 })));
  });

  it('applies a facet immediately, without another press on Search', async () => {
    searchFor('rau');
    await screen.findByText('Rau muống');
    const before = vi.mocked(ProductApi.list).mock.calls.length;

    await userEvent.selectOptions(screen.getByLabelText('Category'), '3');

    // No click on the Search button in between: the request goes out on its own.
    await waitFor(() => expect(vi.mocked(ProductApi.list).mock.calls.length).toBeGreaterThan(before));
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
  });

  it('keeps every market in the results when a price band is chosen', async () => {
    searchFor('rau');
    // By the link, not by the text: the market facet lists the same name in its <select>.
    await screen.findByRole('link', { name: /Chợ Bà Chiểu/ });

    await userEvent.click(screen.getByRole('button', { name: /Under/ }));

    // A market has no price. Narrowing by price must not make markets disappear.
    await waitFor(() => expect(ProductApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ maxPrice: 0.99 })));
    expect(screen.getByRole('link', { name: /Chợ Bà Chiểu/ })).toBeInTheDocument();
  });

  it('sends the price band and the price sort in the same request', async () => {
    searchFor('rau');
    await screen.findByText('Rau muống');

    await userEvent.click(screen.getByRole('button', { name: /Under/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Price' }));

    await waitFor(() =>
      expect(ProductApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ maxPrice: 0.99, sort: 'price_asc' })),
    );
  });
});
