import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QualityReports from './QualityReports';
import QualityReportApi, {
  type FarmerQualityReportsDto,
  type QualityReportDto,
  type ShelfLifeStandingDto,
} from '@/api-requests/quality-report.requests';

vi.mock('@/api-requests/quality-report.requests', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/api-requests/quality-report.requests')>();
  return { ...real, default: { mine: vi.fn(), respond: vi.fn() } };
});

const report = (patch: Partial<QualityReportDto> = {}): QualityReportDto => ({
  id: 9,
  orderId: 21,
  orderCode: 'ML-20260920-0007',
  farmerId: 15,
  stallName: 'Vườn Út Hiền',
  stallStatus: 'approved',
  customerName: 'Nguyễn Văn An',
  productId: 3,
  productName: 'Rau muống',
  pickupDate: '2026-10-03',
  bestBefore: '2026-10-07',
  storageMode: 'chilled',
  spoiledOn: '2026-10-05',
  beforePromise: true,
  problem: 'mold',
  note: 'Lá úng đen',
  photoUrl: null,
  shelfLifeExtended: true,
  extendedByDays: 2,
  status: 'open',
  farmerResponse: null,
  farmerRespondedAt: null,
  decisionNote: null,
  decidedAt: null,
  createdAt: '2026-10-05T13:00:00Z',
  stallActiveStrikes: 1,
  ...patch,
});

// Typed explicitly: a bare object literal would infer `extensionLockedUntil: null`, rejecting the string the lock test passes.
const NO_STRIKES: ShelfLifeStandingDto = { activeViolations: 0, limit: 3, windowDays: 90, extensionLockedUntil: null };

const page = (items: QualityReportDto[], standing = NO_STRIKES): FarmerQualityReportsDto => ({
  standing,
  reports: { items, page: 1, pageSize: 50, total: items.length },
});

// R13-2: LoadError's help text renders a react-router <Link to="/feedback">, which throws outside a Router.
const renderList = () =>
  render(
    <MemoryRouter>
      <QualityReports />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.mocked(QualityReportApi.mine)
    .mockReset()
    .mockResolvedValue(page([report()]));
  vi.mocked(QualityReportApi.respond).mockReset();
});

describe('QualityReports (farmer, FR-122)', () => {
  it('lists what the customer saw, how much longer it was set, and where it stands', async () => {
    renderList();

    expect(await screen.findByRole('heading', { name: 'Rau muống' })).toBeInTheDocument();
    expect(screen.getByText('Extended +2 days')).toBeInTheDocument();
    expect(screen.getByText('Waiting for a decision')).toBeInTheDocument();
    expect(screen.getByText('Order ML-20260920-0007 · Nguyễn Văn An')).toBeInTheDocument();
    expect(screen.getByText('Mold · “Lá úng đen”')).toBeInTheDocument();
    expect(screen.getByText(/spoiled Mon 05\/10 \(before its date\)/)).toBeInTheDocument();
  });

  it('saves a reply while the report is open', async () => {
    vi.mocked(QualityReportApi.respond).mockResolvedValue(report({ farmerResponse: 'Khách để nhiệt độ thường.' }));
    renderList();

    await userEvent.type(await screen.findByLabelText('Your reply, for the admin'), 'Khách để nhiệt độ thường.');
    await userEvent.click(screen.getByRole('button', { name: 'Save reply' }));

    expect(QualityReportApi.respond).toHaveBeenCalledWith(9, 'Khách để nhiệt độ thường.');
    expect(screen.getByLabelText('Your reply, for the admin')).toHaveValue('Khách để nhiệt độ thường.');
  });

  it('shows the decision and no reply box once an admin decided', async () => {
    vi.mocked(QualityReportApi.mine).mockResolvedValue(
      page([report({ status: 'confirmed', farmerResponse: 'Hàng giao đúng hạn.', decisionNote: 'Hư sau 1 ngày.' })]),
    );
    renderList();

    expect(await screen.findByText('Confirmed by an admin')).toBeInTheDocument();
    expect(screen.getByText('Your reply: Hàng giao đúng hạn.')).toBeInTheDocument();
    expect(screen.getByText('Admin note: Hư sau 1 ngày.')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('shows the strikes, and the lock with the day it ends', async () => {
    vi.mocked(QualityReportApi.mine).mockResolvedValueOnce(
      page([report()], { activeViolations: 2, limit: 3, windowDays: 90, extensionLockedUntil: null }),
    );
    const first = renderList();
    expect(await screen.findByText('Shelf-life strikes: 2 of 3 in 90 days')).toBeInTheDocument();
    first.unmount();

    vi.mocked(QualityReportApi.mine).mockResolvedValueOnce(
      page([report()], { activeViolations: 3, limit: 3, windowDays: 90, extensionLockedUntil: '2026-11-15T03:00:00Z' }),
    );
    renderList();
    expect(await screen.findByText('Longer shelf lives are locked until 15/11/2026')).toBeInTheDocument();
  });

  it('says so when there is nothing yet, and offers a retry when loading failed', async () => {
    vi.mocked(QualityReportApi.mine).mockResolvedValueOnce(page([]));
    const first = renderList();
    expect(await screen.findByText('No spoiled reports')).toBeInTheDocument();
    first.unmount();

    vi.mocked(QualityReportApi.mine).mockRejectedValueOnce(new Error('network'));
    renderList();
    await userEvent.click(await screen.findByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('heading', { name: 'Rau muống' })).toBeInTheDocument();
  });
});
