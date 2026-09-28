import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it, vi, afterEach } from 'vitest';
import AuthApi from '@/api-requests/auth.requests';
import { privateApi, watchForAccountDeactivated, watchForStallSuspended } from './axiosInstance';
import Session from './session';
import BlockedNotice from './blockedNotice';

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
    expect(BlockedNotice.peek()).toEqual({
      kind: 'account',
      message: 'Your account has been deactivated. Reason: No-shows.',
    });
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

    expect(BlockedNotice.peek()).toBeNull();
    expect(Session.getAccessToken()).toBe('still-valid');
  });
});

describe('watchForStallSuspended', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Session.clear();
    sessionStorage.clear();
  });

  it('stashes the reason and redirects to the pending screen, without clearing the session', async () => {
    // D-09: a suspended stall stays signed in so the Farmer can still finish orders already
    // accepted — unlike an account ban, this must never sign them out.
    Session.save({ accessToken: 'still-valid', user: { id: 1 } as never }, false);
    const assignSpy = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign: assignSpy });
    const error = new AxiosError('Forbidden');
    error.response = {
      status: 403,
      statusText: 'Forbidden',
      headers: {},
      config: {} as never,
      data: {
        success: false,
        message: 'Your stall is suspended. Reason: Missed pickups.',
        error: { code: 'STALL_SUSPENDED', details: [] },
      },
    };

    await expect(watchForStallSuspended(error)).rejects.toBe(error);

    expect(Session.getAccessToken()).toBe('still-valid');
    expect(BlockedNotice.peek()).toEqual({
      kind: 'stall',
      message: 'Your stall is suspended. Reason: Missed pickups.',
    });
    expect(assignSpy).toHaveBeenCalledWith('/farmer/pending');
  });

  it('leaves every other error alone', async () => {
    const error = new AxiosError('Server error');
    error.response = {
      status: 500,
      statusText: 'Internal Server Error',
      headers: {},
      config: {} as never,
      data: {},
    };

    await expect(watchForStallSuspended(error)).rejects.toBe(error);

    expect(BlockedNotice.peek()).toBeNull();
  });
});

/** The refresh a 401 triggers: only a real rejection of /auth/refresh ends the session (FR-003). */
describe('refresh after a 401', () => {
  const originalAdapter = privateApi.defaults.adapter;

  afterEach(() => {
    privateApi.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
    Session.clear();
    sessionStorage.clear();
  });

  /** The original request always answers 401, so the interceptor goes through /auth/refresh. */
  const expiredAccessToken = () => {
    privateApi.defaults.adapter = (config: InternalAxiosRequestConfig) =>
      Promise.reject(
        new AxiosError('Unauthorized', '401', config, undefined, {
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
          config: { headers: new AxiosHeaders() },
          data: { success: false, message: 'Your session has expired.', error: { code: 'UNAUTHORIZED' } },
        }),
      );
  };

  const refreshFailsWith = (status: number | undefined) => {
    const error = new AxiosError(status ? 'failed' : 'Network Error', status ? String(status) : 'ERR_NETWORK');
    if (status) {
      error.response = { status, statusText: '', headers: {}, config: {} as never, data: {} };
    }
    vi.spyOn(AuthApi, 'refreshToken').mockRejectedValue(error);
  };

  it.each([401, 403])('signs out when the refresh itself is refused (%i)', async (status) => {
    Session.save({ accessToken: 'stale-token', user: { id: 1 } as never }, false);
    expiredAccessToken();
    refreshFailsWith(status);

    await expect(privateApi.get('/orders')).rejects.toBeInstanceOf(AxiosError);

    expect(Session.getAccessToken()).toBeNull();
  });

  it.each([undefined, 500, 503])('keeps the session when the refresh could not be checked (%s)', async (status) => {
    Session.save({ accessToken: 'stale-token', user: { id: 1 } as never }, false);
    expiredAccessToken();
    refreshFailsWith(status);

    await expect(privateApi.get('/orders')).rejects.toBeInstanceOf(AxiosError);

    expect(Session.getAccessToken()).toBe('stale-token');
  });
});
