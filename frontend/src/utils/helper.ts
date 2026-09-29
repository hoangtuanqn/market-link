import { AxiosError } from 'axios';
import i18n from '@/i18n';
import type { ApiResponse } from '@/types/api.types';
import type { UserType } from '@/types/user.types';

class Helper {
  static nextStepAfterSocialLogin(user: Pick<UserType, 'phone' | 'address' | 'hasPassword'>) {
    if (!user.phone || !user.address) return '/auth/complete-profile';
    if (user.hasPassword === false) return '/auth/set-password';
    return '/';
  }

  static cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(' ');
  }

  static getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof AxiosError) {
      if (!error.response) return i18n.t('errors.network');
      const message = (error.response.data as Partial<ApiResponse<unknown>> | undefined)?.message;
      if (message) return message;
    }
    return fallback;
  }

  static getErrorCode(error: unknown): string | undefined {
    if (!(error instanceof AxiosError)) return undefined;
    return (error.response?.data as Partial<ApiResponse<unknown>> | undefined)?.error?.code;
  }

  static getFieldErrors(error: unknown): Record<string, string> {
    if (!(error instanceof AxiosError)) return {};
    const details = (error.response?.data as Partial<ApiResponse<unknown>> | undefined)?.error?.details ?? [];
    return Object.fromEntries(details.filter((d) => d.field).map((d) => [d.field, d.message]));
  }

  static getRetryAfterSeconds(error: unknown): number | undefined {
    if (!(error instanceof AxiosError)) return undefined;
    const seconds = Number(error.response?.headers?.['retry-after']);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
  }

  static mediaUrl(path?: string | null): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
      return path;
    }
    if (path.startsWith('/') && !path.startsWith('/uploads/')) return path;
    const base = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
    return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  }
}
export default Helper;
