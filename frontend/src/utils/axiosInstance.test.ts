import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it, vi, afterEach } from 'vitest';
import AuthApi from '@/api-requests/auth.requests';
import { Cart } from '@/lib/cart';
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
    Session.save({ accessToken: 'stale-token', user: { id: 1 } as never }, false);
    Cart.add({ productId: 1, name: 'Tomato', unit: 'kg', price: 1.5, max: 5, farmerId: 7, stallName: 'Cô Tư' }, 1);
    const assignSpy = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign: assignSpy });
    const error = new AxiosError('Unauthorized');
    error.response = {
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: {} as never,
      data: {
        success: false,
        message: 'Your account has been deactivated. Reason: No-shows.',
        error: { code: 'ACCOUNT_DEACTIVATED', details: [] },
      },
    };

    await expect(watchForAccountDeactivated(error)).rejects.toBe(error);

    expect(Session.getAccessToken()).toBeNull();
    expect(Cart.lines()).toEqual([]);
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

describe('refresh after a 401', () => {
  const originalAdapter = privateApi.defaults.adapter;

  afterEach(() => {
    privateApi.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
    Session.clear();
    sessionStorage.clear();
  });

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
