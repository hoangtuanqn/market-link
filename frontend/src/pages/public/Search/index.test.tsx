import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CatalogApi from '@/api-requests/catalog.requests';
import ProductApi from '@/api-requests/product.requests';
import StallApi, { type StallSummaryDto } from '@/api-requests/stall.requests';
import SearchPage from './index';

vi.mock('@/api-requests/catalog.requests', () => ({
  default: { listMarkets: vi.fn(), listCategories: vi.fn() },
}));
vi.mock('@/api-requests/product.requests', () => ({
  default: { list: vi.fn() },
}));
vi.mock('@/components/MarketMap', () => ({ default: () => null }));

const stall: StallSummaryDto = {
  farmerId: 4,
  stallName: 'Củ quả Đức Củ Chi',
  contactPerson: 'Phạm Hữu Đức',
  logoUrl: null,
  stallCode: 'A-20',
  stallLatitude: 10.77,
  stallLongitude: 106.69,
  ratingAvg: 5,
  ratingCount: 1,
  operatingDays: [1, 2, 3, 4, 5, 6],
  pickupStartTime: '07:00',
  pickupEndTime: '11:00',
} as StallSummaryDto;

const page = <T,>(items: T[]) => ({ items, total: items.length, page: 1, pageSize: 50 });

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/search" element={<SearchPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('SearchPage scope (FR-021)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(CatalogApi.listCategories).mockResolvedValue([]);
    vi.mocked(CatalogApi.listMarkets).mockResolvedValue(page([]) as Awaited<ReturnType<typeof CatalogApi.listMarkets>>);
    vi.mocked(ProductApi.list).mockResolvedValue(page([]) as Awaited<ReturnType<typeof ProductApi.list>>);
    vi.spyOn(StallApi, 'list').mockResolvedValue(page([stall]));
  });

  /** Home "See all stalls" links to /search?scope=farmer with no keyword: it must list the stalls. */
  it('lists the stalls when the scope is stalls and there is no keyword', async () => {
    renderAt('/search?scope=farmer');

    expect(await screen.findByText('Củ quả Đức Củ Chi')).toBeInTheDocument();
    expect(screen.queryByText('Type something to search')).not.toBeInTheDocument();
    expect(StallApi.list).toHaveBeenCalledWith(expect.not.objectContaining({ q: expect.anything() }));
    expect(ProductApi.list).not.toHaveBeenCalled();
  });

  it('opens the result tab of the scope that was searched', async () => {
    renderAt('/search?scope=product&q=rau');

    expect(await screen.findByRole('tab', { name: /Products/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('heading', { name: 'Stalls' })).not.toBeInTheDocument();
  });

  it('still asks for a keyword on the other scopes', async () => {
    renderAt('/search?scope=all');

    expect(await screen.findByText('Type something to search')).toBeInTheDocument();
    expect(StallApi.list).not.toHaveBeenCalled();
  });
});
