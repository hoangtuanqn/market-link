import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import AuthApi from '@/api-requests/auth.requests';
import Session from './session';

const options = {
  baseURL: `${import.meta.env.VITE_API_URL ?? 'http://localhost:8080'}/api/v1`,
  timeout: 10000,
  // gửi/nhận cookie refresh_token (HttpOnly) — backend bật allowCredentials
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
};

export const publicApi = axios.create(options);
export const privateApi = axios.create(options);

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

/** Tên khoá Web Locks dùng chung giữa các tab cùng origin. */
const REFRESH_LOCK = 'marketlink-refresh-token';

/** Chạy lần lượt giữa các tab (Web Locks); trình duyệt không hỗ trợ thì chạy luôn. */
const withRefreshLock = <T>(task: () => Promise<T>): Promise<T> =>
  navigator.locks ? navigator.locks.request(REFRESH_LOCK, task) : task();

let refreshPromise: Promise<string> | null = null; // refresh đang chạy trong tab này, các request 401 dùng chung

/**
 * Lấy access token mới. Backend xoay vòng refresh token mỗi lần gọi, nên hai tab cùng refresh bằng một cookie thì tab
 * đến sau bị từ chối: khoá giữa các tab để chúng refresh lần lượt, và nếu tab khác vừa có token mới (khác token của
 * request bị 401) thì dùng luôn, không gọi refresh nữa.
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

    // đánh dấu trước khi chờ: request gọi lại mà vẫn 401 thì không refresh thêm lần nữa
    origin._retry = true;
    const staleToken = String(origin.headers.Authorization ?? '').replace(/^Bearer /, '') || null;

    try {
      await refreshAccessToken(staleToken);
      return privateApi(origin); // interceptor request gắn token mới từ Session
    } catch (err) {
      Session.clear();
      return Promise.reject(err);
    }
  },
);
