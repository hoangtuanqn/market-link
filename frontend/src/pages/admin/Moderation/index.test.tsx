import { render, screen } from '@testing-library/react';
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

beforeEach(() => {
  vi.mocked(ProductApi.list).mockResolvedValue({ items: [] } as never);
  vi.mocked(ProductApi.adminHidden).mockResolvedValue([] as never);
  vi.mocked(ReviewApi.adminList).mockResolvedValue({ items: [] } as never);
});

describe('AdminModerationPage tabs', () => {
  /** FR-123: QUALITY_ESCALATED links to /admin/moderation?tab=quality. */
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
