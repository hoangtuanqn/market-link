import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReportedMessages from './ReportedMessages';
import ModerationApi from '@/api-requests/moderation.requests';

vi.mock('@/api-requests/moderation.requests', () => ({
  default: { reports: vi.fn(), report: vi.fn(), hide: vi.fn(), dismiss: vi.fn() },
}));
vi.mock('@/components/chat/ChatPhoto', () => ({ default: () => <span>photo</span> }));

const ok = <T,>(data: T) => ({ success: true, message: 'OK', data, timestamp: '' }) as never;
const row = {
  reportId: 9,
  messageId: 55,
  conversationId: 42,
  reason: 'scam',
  status: 'new',
  reporterName: 'An',
  senderName: 'Cô Tư',
  preview: 'Chuyển khoản trước 500k',
  reportedAt: '2026-09-26T09:00:00Z',
};
const detail = {
  ...row,
  context: [
    {
      id: 54,
      senderId: 7,
      senderName: 'An',
      kind: 'text',
      body: 'Còn rau không?',
      hasPhoto: false,
      reported: false,
      hidden: false,
      createdAt: '2026-09-26T08:58:00Z',
    },
    {
      id: 55,
      senderId: 3,
      senderName: 'Cô Tư',
      kind: 'text',
      body: 'Chuyển khoản trước 500k',
      hasPhoto: false,
      reported: true,
      hidden: false,
      createdAt: '2026-09-26T08:59:00Z',
    },
  ],
};

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });
  vi.mocked(ModerationApi.reports).mockResolvedValue(ok({ items: [row], page: 1, pageSize: 20, total: 1 }));
  vi.mocked(ModerationApi.report).mockResolvedValue(ok(detail));
  vi.mocked(ModerationApi.hide).mockResolvedValue(ok(null));
  vi.mocked(ModerationApi.dismiss).mockResolvedValue(ok(null));
});

describe('ReportedMessages', () => {
  /** Spec §8.3/§9.4: the admin's boundary must be stated plainly on screen. */
  it('tells the admin what they can and cannot read', async () => {
    render(<ReportedMessages />);
    expect(await screen.findByText(/only messages someone reported/i)).toBeInTheDocument();
  });

  it('lists new reports first, with the reason and who reported it', async () => {
    render(<ReportedMessages />);
    expect(await screen.findByText('Chuyển khoản trước 500k')).toBeInTheDocument();
    expect(ModerationApi.reports).toHaveBeenCalledWith({ status: 'new', page: 1, pageSize: 20 });
    expect(screen.getByText(/scam/i)).toBeInTheDocument();
    expect(screen.getByText(/Reported by An/)).toBeInTheDocument();
  });

  it('opens the report with the messages around it, the reported one marked', async () => {
    render(<ReportedMessages />);
    await userEvent.click(await screen.findByRole('button', { name: /review/i }));

    const context = await screen.findByRole('list', { name: /messages around/i });
    expect(within(context).getAllByRole('listitem')).toHaveLength(2);
    expect(within(context).getByText('Chuyển khoản trước 500k').closest('li')).toHaveAttribute('aria-current', 'true');
  });

  it('hides the message after confirming, and drops the row from the queue', async () => {
    render(<ReportedMessages />);
    await userEvent.click(await screen.findByRole('button', { name: /review/i }));
    await userEvent.click(await screen.findByRole('button', { name: /hide message/i }));
    await userEvent.click(screen.getByRole('button', { name: /^hide$/i }));

    expect(ModerationApi.hide).toHaveBeenCalledWith(55);
    expect(screen.queryByText('Chuyển khoản trước 500k')).not.toBeInTheDocument();
  });

  it('dismisses the report without hiding anything', async () => {
    render(<ReportedMessages />);
    await userEvent.click(await screen.findByRole('button', { name: /review/i }));
    await userEvent.click(await screen.findByRole('button', { name: /dismiss/i }));

    expect(ModerationApi.dismiss).toHaveBeenCalledWith(9);
    expect(ModerationApi.hide).not.toHaveBeenCalled();
  });

  it('shows an empty queue with something useful to say', async () => {
    vi.mocked(ModerationApi.reports).mockResolvedValue(ok({ items: [], page: 1, pageSize: 20, total: 0 }));
    render(<ReportedMessages />);
    expect(await screen.findByText(/no reported messages/i)).toBeInTheDocument();
  });
});
