import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AccountDeactivatedToastSync from './AccountDeactivatedToastSync';
import AccountDeactivatedNotice from '@/utils/accountDeactivatedNotice';
import Notification from '@/utils/notification';

describe('AccountDeactivatedToastSync', () => {
  it('toasts a stashed message once on mount and consumes it', () => {
    AccountDeactivatedNotice.stash('Your account has been deactivated. Reason: No-shows.');
    const toastSpy = vi.spyOn(Notification, 'error').mockImplementation(() => '');

    render(<AccountDeactivatedToastSync />);

    expect(toastSpy).toHaveBeenCalledWith({ text: 'Your account has been deactivated. Reason: No-shows.' });
    expect(AccountDeactivatedNotice.consume()).toBeNull();
  });

  it('does nothing when there is no stashed message', () => {
    const toastSpy = vi.spyOn(Notification, 'error').mockImplementation(() => '');

    render(<AccountDeactivatedToastSync />);

    expect(toastSpy).not.toHaveBeenCalled();
  });
});
