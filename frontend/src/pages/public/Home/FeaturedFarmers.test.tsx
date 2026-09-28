import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { StallDetailDto } from '@/api-requests/stall.requests';
import FeaturedFarmers from './FeaturedFarmers';

const stall: StallDetailDto = {
  farmerId: 8,
  stallName: 'Trứng gà Khánh Hòa',
  contactPerson: 'Võ Thị Hoa',
  description: 'Free-range eggs collected the morning before market.',
  orderCutoffHours: 12,
  ratingAvg: 4.5,
  ratingCount: 2,
  approvalStatus: 'approved',
  markets: [
    { farmerMarketId: 1, marketId: 1, marketName: 'Chợ Bà Chiểu', operatingDays: [] },
    { farmerMarketId: 2, marketId: 3, marketName: 'Chợ Tân Định', operatingDays: [] },
  ],
};

const renderWith = (stalls: StallDetailDto[]) =>
  render(
    <MemoryRouter>
      <FeaturedFarmers stalls={stalls} />
    </MemoryRouter>,
  );

describe('FeaturedFarmers (FR-082)', () => {
  it("shows the stall's own bio and markets", () => {
    renderWith([stall]);

    expect(screen.getByText('“Free-range eggs collected the morning before market.”')).toBeInTheDocument();
    expect(screen.getByText('Chợ Bà Chiểu, Chợ Tân Định')).toBeInTheDocument();
    expect(screen.queryByText(/Thảo Điền Market/)).not.toBeInTheDocument();
  });

  /** An empty list is an empty state, not three made-up farmers with made-up ratings. */
  it('shows the empty state instead of sample farmers', () => {
    renderWith([]);

    expect(screen.getByText('No growers available at the moment.')).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });
});
