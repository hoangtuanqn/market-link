import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FarmerReviewsPage from './index';
import ReviewApi from '@/api-requests/review.requests';
import StallApi from '@/api-requests/stall.requests';

vi.mock('@/api-requests/review.requests', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/api-requests/review.requests')>();
  return { ...real, default: { mine: vi.fn(), respond: vi.fn() } };
});
vi.mock('@/api-requests/stall.requests', () => ({ default: { myProfile: vi.fn() } }));
vi.mock('./QualityReports', () => ({ default: () => <p>spoiled reports list</p> }));

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/farmer/reviews" element={<FarmerReviewsPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.mocked(ReviewApi.mine).mockResolvedValue({ items: [], page: 1, pageSize: 50, total: 0 });
  vi.mocked(StallApi.myProfile).mockResolvedValue({
    stallName: 'Vườn Út Hiền',
    ratingAvg: 4.5,
    ratingCount: 8,
  } as never);
});

describe('FarmerReviewsPage tabs', () => {
  it('opens the spoiled reports from the address', async () => {
    renderAt('/farmer/reviews?tab=spoiled');

    expect(await screen.findByText('spoiled reports list')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Spoiled reports' })).toHaveAttribute('aria-selected', 'true');
  });

  it('shows the reviews by default and switches tabs', async () => {
    renderAt('/farmer/reviews');

    expect(await screen.findByText('No reviews yet')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Spoiled reports' }));
    expect(await screen.findByText('spoiled reports list')).toBeInTheDocument();
  });
});
