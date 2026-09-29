import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminModerationPage from './index';
import ProductApi from '@/api-requests/product.requests';
import ReviewApi from '@/api-requests/review.requests';

vi.mock('@/api-requests/product.requests', () => ({
  default: { list: vi.fn(), adminHidden: vi.fn(), adminHide: vi.fn(), adminUnhide: vi.fn() },
}));
vi.mock('@/api-requests/review.requests', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/api-requests/review.requests')>();
  return { ...real, default: { adminList: vi.fn(), hide: vi.fn(), unhide: vi.fn() } };
});
vi.mock('./ReportedMessages', () => ({ default: () => <p>reported messages queue</p> }));
vi.mock('./QualityReports', () => ({ default: () => <p>spoiled reports queue</p> }));

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/moderation" element={<AdminModerationPage />} />
      </Routes>
    </MemoryRouter>,
  );

const product = (id: number) => ({
  id,
  name: `Rau muống ${id}`,
  stall: 'Vườn Út Hiền',
  category: 'Vegetables',
  price: 0.33,
  unit: 'bunch',
});

beforeEach(() => {
  vi.mocked(ProductApi.list).mockResolvedValue({ items: [] } as never);
  vi.mocked(ProductApi.adminHidden).mockResolvedValue([] as never);
  vi.mocked(ReviewApi.adminList).mockResolvedValue({ items: [] } as never);
});

describe('AdminModerationPage tabs', () => {
  it('opens the spoiled reports queue from the address', async () => {
    renderAt('/admin/moderation?tab=quality');

    expect(await screen.findByText('spoiled reports queue')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Spoiled reports' })).toHaveAttribute('aria-selected', 'true');
  });

  it('starts on the reviews and switches to the spoiled reports', async () => {
    renderAt('/admin/moderation');

    expect(screen.getByRole('tab', { name: 'Reviews' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('tab', { name: 'Spoiled reports' }));
    expect(await screen.findByText('spoiled reports queue')).toBeInTheDocument();
  });
});

describe('AdminModerationPage product listings (FR-074)', () => {
  it('searches and pages on the server instead of filtering one fetched page', async () => {
    vi.mocked(ProductApi.list).mockResolvedValue({ items: [product(1)], page: 1, pageSize: 20, total: 45 } as never);
    renderAt('/admin/moderation?tab=products');

    expect(await screen.findByText('Rau muống 1')).toBeInTheDocument();
    expect(ProductApi.list).toHaveBeenLastCalledWith({ q: undefined, sort: 'newest', page: 1, pageSize: 20 });

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search products' }), 'rau');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() =>
      expect(ProductApi.list).toHaveBeenLastCalledWith({ q: 'rau', sort: 'newest', page: 1, pageSize: 20 }),
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Page 3' }));
    await waitFor(() =>
      expect(ProductApi.list).toHaveBeenLastCalledWith({ q: 'rau', sort: 'newest', page: 3, pageSize: 20 }),
    );
  });
});
