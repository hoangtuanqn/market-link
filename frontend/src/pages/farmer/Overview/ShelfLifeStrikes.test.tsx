import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import ShelfLifeStrikes from './ShelfLifeStrikes';
import QualityReportApi from '@/api-requests/quality-report.requests';

vi.mock('@/api-requests/quality-report.requests', () => ({ default: { standing: vi.fn() } }));

const renderCard = () =>
  render(
    <MemoryRouter>
      <ShelfLifeStrikes />
    </MemoryRouter>,
  );

describe('ShelfLifeStrikes (FR-123)', () => {
  /** Spec §4.4.4: the card only shows when the stall has strikes. */
  it('shows nothing while the stall has no strikes', async () => {
    vi.mocked(QualityReportApi.standing).mockResolvedValue({
      activeViolations: 0,
      limit: 3,
      windowDays: 90,
      extensionLockedUntil: null,
    });
    const { container } = renderCard();

    await waitFor(() => expect(QualityReportApi.standing).toHaveBeenCalled());
    await act(async () => {});
    expect(container).toBeEmptyDOMElement();
  });

  it('counts the strikes and links to the reports', async () => {
    vi.mocked(QualityReportApi.standing).mockResolvedValue({
      activeViolations: 2,
      limit: 3,
      windowDays: 90,
      extensionLockedUntil: null,
    });
    renderCard();

    expect(await screen.findByText('Shelf-life strikes: 2 of 3 in 90 days')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See the reports' })).toHaveAttribute(
      'href',
      '/farmer/reviews?tab=spoiled',
    );
  });

  it('says until when longer shelf lives are locked', async () => {
    vi.mocked(QualityReportApi.standing).mockResolvedValue({
      activeViolations: 3,
      limit: 3,
      windowDays: 90,
      extensionLockedUntil: '2026-11-15T03:00:00Z',
    });
    renderCard();

    expect(await screen.findByText(/Longer shelf lives are locked until 15\/11\/2026\./)).toBeInTheDocument();
  });

  /** Ruling 14: a secondary notice — a failed read leaves the dashboard as it was. */
  it('stays out of the way when the strikes cannot be read', async () => {
    vi.mocked(QualityReportApi.standing).mockRejectedValue(new Error('network'));
    const { container } = renderCard();

    await waitFor(() => expect(QualityReportApi.standing).toHaveBeenCalled());
    await act(async () => {});
    expect(container).toBeEmptyDOMElement();
  });
});
