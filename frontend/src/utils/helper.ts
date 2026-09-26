import { AxiosError } from 'axios';
import i18n from '@/i18n';
import type { ApiResponse } from '@/types/api.types';
import type { UserType } from '@/types/user.types';

class Helper {
  /**
   * The next page after Google sign-in: missing phone number / address → complete the profile; no password yet → set a
   * password; all done → the home page.
   */
  static nextStepAfterSocialLogin(user: Pick<UserType, 'phone' | 'address' | 'hasPassword'>) {
    if (!user.phone || !user.address) return '/auth/complete-profile';
    if (user.hasPassword === false) return '/auth/set-password';
    return '/';
  }

  /** Joins class names, skipping falsy values. */
  static cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(' ');
  }

  /**
   * The message to show the user: prefer the message the backend returned, when there is none (lost network, timeout,
   * an odd response) use fallback.
   */
  static getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof AxiosError) {
      if (!error.response) return i18n.t('errors.network');
      const message = (error.response.data as Partial<ApiResponse<unknown>> | undefined)?.message;
      if (message) return message;
    }
    return fallback;
  }

  /** The backend's error code (error.code), e.g. INVALID_RESET_TOKEN; undefined when there is no response. */
  static getErrorCode(error: unknown): string | undefined {
    if (!(error instanceof AxiosError)) return undefined;
    return (error.response?.data as Partial<ApiResponse<unknown>> | undefined)?.error?.code;
  }

  /** Per-field errors (the backend's error.details) → { email: '...', password: '...' }. */
  static getFieldErrors(error: unknown): Record<string, string> {
    if (!(error instanceof AxiosError)) return {};
    const details = (error.response?.data as Partial<ApiResponse<unknown>> | undefined)?.error?.details ?? [];
    return Object.fromEntries(details.filter((d) => d.field).map((d) => [d.field, d.message]));
  }
}
export default Helper;
