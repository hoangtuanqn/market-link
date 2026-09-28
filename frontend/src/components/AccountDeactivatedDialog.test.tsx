import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import AccountDeactivatedDialog from './AccountDeactivatedDialog';
import AccountDeactivatedNotice from '@/utils/accountDeactivatedNotice';

describe('AccountDeactivatedDialog', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('explains the ban with the reason the server gave, and consumes it', () => {
    AccountDeactivatedNotice.stash('Your account has been deactivated. Reason: No-shows.');

    render(<AccountDeactivatedDialog />);

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/Reason: No-shows\./)).toBeInTheDocument();
    // consumed, so a later reload does not show it a second time
    expect(AccountDeactivatedNotice.peek()).toBeNull();
  });

  it('never renders the word undefined when the server sent no reason', () => {
    AccountDeactivatedNotice.stash('');

    render(<AccountDeactivatedDialog />);

    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
  });

  it('shows nothing at all on a normal visit', () => {
    render(<AccountDeactivatedDialog />);

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('closes when the visitor acknowledges it', () => {
    AccountDeactivatedNotice.stash('Your account has been deactivated. Reason: Fake account.');
    render(<AccountDeactivatedDialog />);

    fireEvent.click(screen.getByRole('button', { name: /i understand/i }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
