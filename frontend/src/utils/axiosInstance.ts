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

let isRefreshing = false; // đang gọi refresh token
let refreshQueue: Array<{
  resolve: () => void;
  reject: (err: unknown) => void;
}> = []; // các request 401 chờ refresh xong để gọi lại
const processQueue = (error?: unknown) => {
  refreshQueue.forEach((p) => (error ? p.reject(error) : p.resolve()));
  refreshQueue = [];
};

privateApi.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (!(error instanceof AxiosError)) return Promise.reject(error);

    const origin: (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined = error.config;
    if (error.response?.status !== 401 || !origin || origin._retry || origin.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve: () => resolve(privateApi(origin)), reject });
      });
    }

    isRefreshing = true;
    origin._retry = true;

    try {
      const { accessToken } = await AuthApi.refreshToken();
      Session.setAccessToken(accessToken);
      processQueue();
      return privateApi(origin);
    } catch (err) {
      processQueue(err);
      Session.clear();
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  },
);
