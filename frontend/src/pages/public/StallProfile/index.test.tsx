import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CatalogApi from '@/api-requests/catalog.requests';
import ProductApi from '@/api-requests/product.requests';
import ReviewApi from '@/api-requests/review.requests';
import StallApi, { type StallDetailDto } from '@/api-requests/stall.requests';
import StallProfilePage from './index';

vi.mock('@/api-requests/catalog.requests', () => ({
  default: { listMarkets: vi.fn() },
}));
vi.mock('@/components/MarketMap', () => ({ default: () => null }));
vi.mock('@/components/chat/MessageStallButton', () => ({ default: () => null }));

const stall: StallDetailDto = {
  farmerId: 1,
  stallName: 'Vườn Út Hiền',
  contactPerson: 'Lê Thị Út Hiền',
  orderCutoffHours: 12,
  ratingAvg: 5,
  ratingCount: 1,
  approvalStatus: 'approved',
  markets: [
    {
      farmerMarketId: 1,
      marketId: 2,
      marketName: 'Chợ Bà Chiểu',
      operatingDays: [
        { dayOfWeek: 3, pickupStartTime: '07:00', pickupEndTime: '11:00' },
        { dayOfWeek: 6, pickupStartTime: '07:00', pickupEndTime: '11:00' },
      ],
    },
  ],
};

const renderStall = () =>
  render(
    <MemoryRouter initialEntries={['/stalls/1']}>
      <Routes>
        <Route path="/stalls/:id" element={<StallProfilePage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('StallProfilePage (FR-011)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(CatalogApi.listMarkets).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 50 } as Awaited<
      ReturnType<typeof CatalogApi.listMarkets>
    >);
    vi.spyOn(StallApi, 'get').mockResolvedValue(stall);
    vi.spyOn(ProductApi, 'byFarmer').mockResolvedValue([]);
    vi.spyOn(ReviewApi, 'forFarmer').mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 50 });
  });

  it('loads the stock of the picked selling day', async () => {
    renderStall();

    await waitFor(() => expect(ProductApi.byFarmer).toHaveBeenCalledWith(1, 3));
    fireEvent.click(await screen.findByRole('radio', { name: /Saturday/ }));

    await waitFor(() => expect(ProductApi.byFarmer).toHaveBeenCalledWith(1, 6));
  });

  it('offers no stall report that sends nothing', async () => {
    renderStall();

    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('button', { name: 'Report this stall' })).not.toBeInTheDocument();
  });
});
