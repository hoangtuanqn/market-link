import { AxiosError } from 'axios';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { watchForAccountDeactivated } from './axiosInstance';
import Session from './session';
import Notification from './notification';

describe('watchForAccountDeactivated', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Session.clear();
  });

  it('clears the session, toasts the server message, and redirects home', async () => {
    Session.save({ accessToken: 'stale-token', user: { id: 1 } as never }, false);
    const toastSpy = vi.spyOn(Notification, 'error').mockImplementation(() => '');
    const assignSpy = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign: assignSpy });
    const error = new AxiosError('Unauthorized');
    error.response = {
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: {} as never,
      data: {
        error: {
          code: 'ACCOUNT_DEACTIVATED',
          message: 'Your account has been deactivated. Reason: No-shows.',
        },
      },
    };

    await expect(watchForAccountDeactivated(error)).rejects.toBe(error);

    expect(Session.getAccessToken()).toBeNull();
    expect(toastSpy).toHaveBeenCalledWith({ text: 'Your account has been deactivated. Reason: No-shows.' });
    expect(assignSpy).toHaveBeenCalledWith('/');
  });

  it('leaves every other error alone', async () => {
    Session.save({ accessToken: 'still-valid', user: { id: 1 } as never }, false);
    const toastSpy = vi.spyOn(Notification, 'error').mockImplementation(() => '');
    const error = new AxiosError('Server error');
    error.response = {
      status: 500,
      statusText: 'Internal Server Error',
      headers: {},
      config: {} as never,
      data: {},
    };

    await expect(watchForAccountDeactivated(error)).rejects.toBe(error);

    expect(toastSpy).not.toHaveBeenCalled();
    expect(Session.getAccessToken()).toBe('still-valid');
  });
});
