import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import StallSuspendedDialog from './StallSuspendedDialog';
import BlockedNotice from '@/utils/blockedNotice';

describe('StallSuspendedDialog', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('explains the suspension with the reason the server gave, and consumes it', () => {
    BlockedNotice.stash('stall', 'Your stall is suspended. Reason: Missed pickups.');

    render(<StallSuspendedDialog />);

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/Reason: Missed pickups\./)).toBeInTheDocument();
    // consumed, so a later reload does not show it a second time
    expect(BlockedNotice.peek()).toBeNull();
  });

  it('never renders the word undefined when the server sent no reason', () => {
    BlockedNotice.stash('stall', '');

    render(<StallSuspendedDialog />);

    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
  });

  it('shows nothing at all on a normal visit', () => {
    render(<StallSuspendedDialog />);

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('shows nothing when the stash is for a deactivated account, not this stall', () => {
    BlockedNotice.stash('account', 'Your account has been deactivated.');

    render(<StallSuspendedDialog />);

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('closes when the visitor acknowledges it', () => {
    BlockedNotice.stash('stall', 'Your stall is suspended. Reason: No-shows.');
    render(<StallSuspendedDialog />);

    fireEvent.click(screen.getByRole('button', { name: /i understand/i }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
