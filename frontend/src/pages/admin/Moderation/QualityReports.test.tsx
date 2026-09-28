import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QualityReports from './QualityReports';
import QualityReportApi, { type QualityReportDto } from '@/api-requests/quality-report.requests';

vi.mock('@/api-requests/quality-report.requests', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/api-requests/quality-report.requests')>();
  return { ...real, default: { adminList: vi.fn(), confirm: vi.fn(), dismiss: vi.fn() } };
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
  note: 'Lá úng đen sau 2 ngày để ngăn mát',
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

const page = (items: QualityReportDto[]) => ({ items, page: 1, pageSize: 50, total: items.length });

const renderQueue = () =>
  render(
    <MemoryRouter>
      <QualityReports />
    </MemoryRouter>,
  );

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });
  vi.mocked(QualityReportApi.adminList)
    .mockReset()
    .mockResolvedValue(page([report()]));
  vi.mocked(QualityReportApi.confirm).mockReset();
  vi.mocked(QualityReportApi.dismiss).mockReset();
});

describe('QualityReports (admin, FR-123)', () => {
  it('opens on the reports that need a decision, with everything the decision rests on', async () => {
    renderQueue();

    expect(await screen.findByText('ML-20260920-0007 · Rau muống · Vườn Út Hiền')).toBeInTheDocument();
    expect(QualityReportApi.adminList).toHaveBeenCalledWith({ status: 'open', escalated: true, pageSize: 50 });
    expect(screen.getByText('Extended +2 days')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Customer: Nguyễn Văn An · picked up Sat 03\/10 · good until Wed 07\/10 · spoiled Mon 05\/10 \(before its date\)/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('The stall has not replied.')).toBeInTheDocument();
    expect(screen.getByText('Shelf-life strikes: 1 of 3 in 90 days')).toBeInTheDocument();
  });

  it('switches to the decided reports', async () => {
    renderQueue();

    await userEvent.click(await screen.findByRole('button', { name: 'Decided' }));

    expect(QualityReportApi.adminList).toHaveBeenLastCalledWith({ status: 'decided', pageSize: 50 });
  });

  it("asks for a note before saying it is not the stall's fault", async () => {
    vi.mocked(QualityReportApi.dismiss).mockResolvedValue(
      report({ status: 'dismissed', decisionNote: 'Khách để nhiệt độ thường.' }),
    );
    renderQueue();
    await userEvent.click(await screen.findByRole('button', { name: "Not the stall's fault" }));
    const dialog = screen.getByRole('dialog');

    await userEvent.click(within(dialog).getByRole('button', { name: "Not the stall's fault" }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent("Say why this is not the stall's fault.");
    expect(QualityReportApi.dismiss).not.toHaveBeenCalled();

    await userEvent.type(within(dialog).getByLabelText("Why it is not the stall's fault"), 'Khách để nhiệt độ thường.');
    await userEvent.click(within(dialog).getByRole('button', { name: "Not the stall's fault" }));

    expect(QualityReportApi.dismiss).toHaveBeenCalledWith(9, 'Khách để nhiệt độ thường.');
    expect(await screen.findByText(/Note: Khách để nhiệt độ thường\./)).toBeInTheDocument();
  });

  /** Spec §4.4.3: the card stays in place and, at 3 strikes, offers the suspend flow. */
  it('confirms the violation and offers to suspend a stall that reached 3 strikes', async () => {
    vi.mocked(QualityReportApi.confirm).mockResolvedValue(report({ status: 'confirmed', stallActiveStrikes: 3 }));
    renderQueue();
    await userEvent.click(await screen.findByRole('button', { name: 'Confirm violation' }));
    const dialog = screen.getByRole('alertdialog');

    expect(within(dialog).getByText(/a strike is recorded/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm violation' }));

    expect(QualityReportApi.confirm).toHaveBeenCalledWith(9, undefined);
    expect(await screen.findByText('Confirmed by an admin')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Suspend stall: Vườn Út Hiền' })).toHaveAttribute(
      'href',
      '/admin/farmers/15?suspend=shelfLifeViolations',
    );
  });

  it('does not offer to suspend below 3 strikes or a stall already suspended', async () => {
    vi.mocked(QualityReportApi.adminList).mockResolvedValue(
      page([
        report({ status: 'confirmed', stallActiveStrikes: 2 }),
        report({ id: 10, status: 'confirmed', stallActiveStrikes: 3, stallStatus: 'suspended' }),
      ]),
    );
    renderQueue();

    expect(await screen.findAllByText('Confirmed by an admin')).toHaveLength(2);
    expect(screen.queryByRole('link', { name: /Suspend stall/ })).not.toBeInTheDocument();
  });

  it('says so when the queue is empty, and offers a retry when it did not load', async () => {
    vi.mocked(QualityReportApi.adminList).mockResolvedValueOnce(page([]));
    const first = renderQueue();
    expect(await screen.findByText('Nothing to decide')).toBeInTheDocument();
    first.unmount();

    vi.mocked(QualityReportApi.adminList).mockRejectedValueOnce(new Error('network'));
    renderQueue();
    await userEvent.click(await screen.findByRole('button', { name: /try again/i }));
    expect(await screen.findByText('ML-20260920-0007 · Rau muống · Vườn Út Hiền')).toBeInTheDocument();
  });
});
