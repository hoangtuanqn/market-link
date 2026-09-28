import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import AuthApi from '@/api-requests/auth.requests';
import PlatformStatus from '@/lib/platformStatus';
import Notification from './notification';
import Session from './session';

const options = {
  baseURL: `${import.meta.env.VITE_API_URL ?? 'http://localhost:8080'}/api/v1`,
  timeout: 10000,
  // send/receive the refresh_token cookie (HttpOnly) — the backend turns on allowCredentials
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
};

export const publicApi = axios.create(options);
export const privateApi = axios.create(options);

/**
 * An admin can turn maintenance mode on while other people are already browsing (MaintenanceModeFilter) — the next API
 * call any of them makes should show the notice right away, no reload needed.
 */
const watchForMaintenanceMode = (error: unknown) => {
  if (error instanceof AxiosError && error.response?.data?.error?.code === 'MAINTENANCE_MODE') {
    PlatformStatus.set(true);
  }
  return Promise.reject(error);
};

publicApi.interceptors.response.use((res) => res, watchForMaintenanceMode);
privateApi.interceptors.response.use((res) => res, watchForMaintenanceMode);

/**
 * FR-072: an already-open session gets 401'd the moment an admin deactivates that account (JwtAuthFilter rejects the
 * token right away, see ACCOUNT_DEACTIVATED). Unlike every other 401 — which retries through /auth/refresh and, if that
 * also fails, lets RequireAuth send the page to /login — this one is final: no retry will ever succeed, so go straight
 * to Home with the server's own reason in a toast.
 */
export const watchForAccountDeactivated = (error: unknown) => {
  if (error instanceof AxiosError && error.response?.data?.error?.code === 'ACCOUNT_DEACTIVATED') {
    Session.clear();
    Notification.error({ text: error.response.data.error.message });
    window.location.assign('/');
  }
  return Promise.reject(error);
};

publicApi.interceptors.response.use((res) => res, watchForAccountDeactivated);
privateApi.interceptors.response.use((res) => res, watchForAccountDeactivated);

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

/** The Web Locks key name shared between tabs of the same origin. */
const REFRESH_LOCK = 'marketlink-refresh-token';

/** Run in turn across tabs (Web Locks); if the browser does not support it, run right away. */
const withRefreshLock = <T>(task: () => Promise<T>): Promise<T> =>
  navigator.locks ? navigator.locks.request(REFRESH_LOCK, task) : task();

let refreshPromise: Promise<string> | null = null; // a refresh already running in this tab, the 401 requests share it

/**
 * Get a new access token. The backend rotates the refresh token on every call, so two tabs refreshing with one cookie
 * makes the tab that arrives later get rejected: lock across tabs so they refresh in turn, and if another tab just
 * obtained a new token (different from the token of the request that got 401) use it right away and do not call refresh
 * again.
 */
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

privateApi.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (!(error instanceof AxiosError)) return Promise.reject(error);

    const origin: (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined = error.config;
    if (error.response?.status !== 401 || !origin || origin._retry || origin.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    // mark before waiting: a retried request that still gets 401 does not refresh once more
    origin._retry = true;
    const staleToken = String(origin.headers.Authorization ?? '').replace(/^Bearer /, '') || null;

    try {
      await refreshAccessToken(staleToken);
      return privateApi(origin); // the request interceptor attaches the new token from Session
    } catch (err) {
      Session.clear();
      return Promise.reject(err);
    }
  },
);
