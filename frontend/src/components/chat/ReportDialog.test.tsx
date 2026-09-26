import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReportDialog from './ReportDialog';
import ConversationApi from '@/api-requests/conversation.requests';

vi.mock('@/api-requests/conversation.requests', () => ({ default: { report: vi.fn() } }));

// jsdom does not have <dialog>'s showModal / close yet
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });
  vi.mocked(ConversationApi.report).mockReset();
});

afterEach(() => {
  cleanup();
});

const setup = () => {
  const onReported = vi.fn();
  render(<ReportDialog messageId={55} onClose={vi.fn()} onReported={onReported} />);
  return { onReported };
};

describe('ReportDialog', () => {
  it('sends the reason and the note', async () => {
    vi.mocked(ConversationApi.report).mockResolvedValue({} as never);
    const { onReported } = setup();

    await userEvent.click(screen.getByDisplayValue('scam'));
    await userEvent.type(screen.getAllByLabelText(/tell us more/i)[0], 'asks for a deposit');
    await userEvent.click(screen.getAllByRole('button', { name: /^report$/i })[0]);

    expect(ConversationApi.report).toHaveBeenCalledWith(55, { reason: 'scam', note: 'asks for a deposit' });
    expect(onReported).toHaveBeenCalledWith(55);
  });

  it('will not send without a reason, and says why', async () => {
    setup();

    expect(screen.getAllByRole('button', { name: /^report$/i })[0]).toBeDisabled();
    expect(screen.getAllByText(/choose a reason/i)[0]).toBeInTheDocument();
  });

  /** Review Focus #4: reporting twice → 409 → treated as already reported. */
  it('treats a second report as already reported', async () => {
    vi.mocked(ConversationApi.report).mockRejectedValue(
      Object.assign(new Error('x'), { isAxiosError: true, response: { status: 409 } }),
    );
    const { onReported } = setup();

    await userEvent.click(screen.getByDisplayValue('spam'));
    await userEvent.click(screen.getAllByRole('button', { name: /^report$/i })[0]);

    expect(onReported).toHaveBeenCalledWith(55);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the dialog open and says so when the report fails', async () => {
    vi.mocked(ConversationApi.report).mockRejectedValue(new Error('network'));
    const { onReported } = setup();

    await userEvent.click(screen.getByDisplayValue('abuse'));
    await userEvent.click(screen.getAllByRole('button', { name: /^report$/i })[0]);

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not send the report/i);
    expect(onReported).not.toHaveBeenCalled();
  });
});
