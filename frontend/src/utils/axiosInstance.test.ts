import { AxiosError } from 'axios';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { watchForAccountDeactivated } from './axiosInstance';
import Session from './session';
import AccountDeactivatedNotice from './accountDeactivatedNotice';

describe('watchForAccountDeactivated', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Session.clear();
    sessionStorage.clear();
  });

  it('clears the session, stashes the server message for the next page, and redirects home', async () => {
    // The redirect that follows is a full document navigation — it tears down React (and any toast
    // shown now) before it can paint. Stashing across the reload, instead of toasting here, is what
    // lets AccountDeactivatedToastSync show it once the new page has actually mounted.
    Session.save({ accessToken: 'stale-token', user: { id: 1 } as never }, false);
    const assignSpy = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign: assignSpy });
    const error = new AxiosError('Unauthorized');
    error.response = {
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: {} as never,
      // The real envelope (ApiResource): `message` sits at the root, and ErrorResource carries only
      // `code` + `details`. Reading `data.error.message` is what made the banner say "undefined".
      data: {
        success: false,
        message: 'Your account has been deactivated. Reason: No-shows.',
        error: { code: 'ACCOUNT_DEACTIVATED', details: [] },
      },
    };

    await expect(watchForAccountDeactivated(error)).rejects.toBe(error);

    expect(Session.getAccessToken()).toBeNull();
    expect(AccountDeactivatedNotice.peek()).toBe('Your account has been deactivated. Reason: No-shows.');
    expect(assignSpy).toHaveBeenCalledWith('/');
  });

  it('leaves every other error alone', async () => {
    Session.save({ accessToken: 'still-valid', user: { id: 1 } as never }, false);
    const error = new AxiosError('Server error');
    error.response = {
      status: 500,
      statusText: 'Internal Server Error',
      headers: {},
      config: {} as never,
      data: {},
    };

    await expect(watchForAccountDeactivated(error)).rejects.toBe(error);

    expect(AccountDeactivatedNotice.peek()).toBeNull();
    expect(Session.getAccessToken()).toBe('still-valid');
  });
});
