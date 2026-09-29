import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import AuthApi from '@/api-requests/auth.requests';
import { Cart } from '@/lib/cart';
import PlatformStatus from '@/lib/platformStatus';
import BlockedNotice from './blockedNotice';
import Session from './session';

const options = {
  baseURL: `${import.meta.env.VITE_API_URL ?? 'http://localhost:8080'}/api/v1`,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
};

export const publicApi = axios.create(options);
export const privateApi = axios.create(options);

const watchForMaintenanceMode = (error: unknown) => {
  if (error instanceof AxiosError && error.response?.data?.error?.code === 'MAINTENANCE_MODE') {
    PlatformStatus.set(true);
  }
  return Promise.reject(error);
};

publicApi.interceptors.response.use((res) => res, watchForMaintenanceMode);
privateApi.interceptors.response.use((res) => res, watchForMaintenanceMode);

export const watchForAccountDeactivated = (error: unknown) => {
  if (error instanceof AxiosError && error.response?.data?.error?.code === 'ACCOUNT_DEACTIVATED') {
    Session.clear();
    Cart.clear();
    const reason = error.response.data?.message;
    BlockedNotice.stash('account', typeof reason === 'string' ? reason : '');
    window.location.assign('/');
  }
  return Promise.reject(error);
};

publicApi.interceptors.response.use((res) => res, watchForAccountDeactivated);
privateApi.interceptors.response.use((res) => res, watchForAccountDeactivated);

export const watchForStallSuspended = (error: unknown) => {
  if (error instanceof AxiosError && error.response?.data?.error?.code === 'STALL_SUSPENDED') {
    const reason = error.response.data?.message;
    BlockedNotice.stash('stall', typeof reason === 'string' ? reason : '');
    window.location.assign('/farmer/pending');
  }
  return Promise.reject(error);
};

publicApi.interceptors.response.use((res) => res, watchForStallSuspended);
privateApi.interceptors.response.use((res) => res, watchForStallSuspended);

privateApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = Session.getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

const REFRESH_LOCK = 'marketlink-refresh-token';

const withRefreshLock = <T>(task: () => Promise<T>): Promise<T> =>
  navigator.locks ? navigator.locks.request(REFRESH_LOCK, task) : task();

let refreshPromise: Promise<string> | null = null; // a refresh already running in this tab, the 401 requests share it

const refreshAccessToken = (staleToken: string | null) => {
  refreshPromise ??= withRefreshLock(async () => {
    const current = Session.getAccessToken();
    if (current && current !== staleToken) return current;
    const result = await AuthApi.refreshToken();
    Session.refreshed(result);
    return result.accessToken;
  }).finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
};

export const isRefreshRejected = (error: unknown) =>
  error instanceof AxiosError && (error.response?.status === 401 || error.response?.status === 403);

privateApi.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (!(error instanceof AxiosError)) return Promise.reject(error);

    const origin: (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined = error.config;
    if (error.response?.status !== 401 || !origin || origin._retry || origin.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    origin._retry = true;
    const staleToken = String(origin.headers.Authorization ?? '').replace(/^Bearer /, '') || null;

    try {
      await refreshAccessToken(staleToken);
      return privateApi(origin); // the request interceptor attaches the new token from Session
    } catch (err) {
      if (isRefreshRejected(err)) Session.clear();
      return Promise.reject(err);
    }
  },
);
