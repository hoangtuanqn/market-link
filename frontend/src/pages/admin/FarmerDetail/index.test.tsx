import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminFarmerDetailPage from './index';
import AdminFarmerApi from '@/api-requests/admin-farmer.requests';

vi.mock('@/api-requests/admin-farmer.requests', () => ({
  default: {
    detail: vi.fn(),
    suspend: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    reinstate: vi.fn(),
    statusHistory: vi.fn(),
  },
}));

const farmer = (patch: Record<string, unknown> = {}) => ({
  id: 15,
  userId: 3,
  stallName: 'Vườn Út Hiền',
  contactPerson: 'Lê Thị Út Hiền',
  email: 'farmer@marketlink.vn',
  phone: '0900000003',
  address: '25 Lê Quang Định, Phường Gia Định',
  approvalStatus: 'approved',
  rejectReason: null,
  suspendReason: null,
  approvedAt: '2026-09-20T03:00:00Z',
  suspendedAt: null,
  createdAt: '2026-09-19T03:00:00Z',
  history: [],
  customerSince: '2026-09-01T03:00:00Z',
  accountStatus: 'active',
  description: null,
  photoUrls: [],
  videoUrl: null,
  activeViolations: 3,
  extensionLockedUntil: '2026-11-30T03:00:00Z',
  ...patch,
});

const ok = (data: unknown) => ({ success: true, message: '', data, timestamp: '' }) as never;

/** Fix round 1: exposes the router's current address so a test can check `?suspend=` was dropped after use. */
const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
};

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <LocationProbe />
      <Routes>
        <Route path="/admin/farmers/:id" element={<AdminFarmerDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });
  vi.mocked(AdminFarmerApi.detail).mockReset().mockResolvedValue(ok(farmer()));
  vi.mocked(AdminFarmerApi.suspend)
    .mockReset()
    .mockResolvedValue(ok(farmer({ approvalStatus: 'suspended' })));
  vi.mocked(AdminFarmerApi.statusHistory).mockReset().mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0 });
});

describe('AdminFarmerDetailPage — shelf-life strikes (FR-123)', () => {
  it("shows the stall's strikes and when the lock ends", async () => {
    renderAt('/admin/farmers/15');

    expect(await screen.findByText('3 of 3 in the last 90 days')).toBeInTheDocument();
    expect(screen.getByText('Longer shelf lives are locked until 30/11/2026.')).toBeInTheDocument();
  });

  it('opens the suspend dialog with the shelf-life reason when the spoiled-report queue sends the admin here', async () => {
    renderAt('/admin/farmers/15?suspend=shelfLifeViolations');

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByRole('button', { name: 'Shelf-life violations' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Suspend stall' }));

    expect(AdminFarmerApi.suspend).toHaveBeenCalledWith(15, 'Shelf-life violations', null);
  });

  it('drops the suspend trigger from the address once it has opened the dialog', async () => {
    renderAt('/admin/farmers/15?suspend=shelfLifeViolations');

    await screen.findByRole('alertdialog');

    // The address update lands in the same effect but is not guaranteed to be in the DOM the instant the
    // dialog itself appears, so wait for it instead of asserting right after findByRole (was flaky).
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/admin/farmers/15'));
  });

  it('fetches the detail only once even though opening it strips the suspend param (M-3)', async () => {
    renderAt('/admin/farmers/15?suspend=shelfLifeViolations');

    await screen.findByRole('alertdialog');
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/admin/farmers/15'));

    // Give a would-be second effect run, triggered by the search-params setter changing identity, a chance to fire.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(AdminFarmerApi.detail).toHaveBeenCalledTimes(1);
  });

  it('does not open it for a stall that is not approved any more', async () => {
    vi.mocked(AdminFarmerApi.detail).mockResolvedValue(
      ok(farmer({ approvalStatus: 'suspended', activeViolations: 0, extensionLockedUntil: null })),
    );
    renderAt('/admin/farmers/15?suspend=shelfLifeViolations');

    expect(await screen.findByText('0 of 3 in the last 90 days')).toBeInTheDocument();
    expect(screen.getByText('The stall can still set a longer shelf life with a promise.')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
