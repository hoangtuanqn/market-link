import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import AccountDeactivatedDialog from './AccountDeactivatedDialog';
import BlockedNotice from '@/utils/blockedNotice';

describe('AccountDeactivatedDialog', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('explains the ban with the reason the server gave, and consumes it', () => {
    BlockedNotice.stash('account', 'Your account has been deactivated. Reason: No-shows.');

    render(<AccountDeactivatedDialog />);

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/Reason: No-shows\./)).toBeInTheDocument();
    // consumed, so a later reload does not show it a second time
    expect(BlockedNotice.peek()).toBeNull();
  });

  it('never renders the word undefined when the server sent no reason', () => {
    BlockedNotice.stash('account', '');

    render(<AccountDeactivatedDialog />);

    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
  });

  it('shows nothing when the stash is for a suspended stall, not this account', () => {
    BlockedNotice.stash('stall', 'Your stall is suspended.');

    render(<AccountDeactivatedDialog />);

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('shows nothing at all on a normal visit', () => {
    render(<AccountDeactivatedDialog />);

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('closes when the visitor acknowledges it', () => {
    BlockedNotice.stash('account', 'Your account has been deactivated. Reason: Fake account.');
    render(<AccountDeactivatedDialog />);

    fireEvent.click(screen.getByRole('button', { name: /i understand/i }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
