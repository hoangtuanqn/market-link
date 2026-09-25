import { AxiosError } from 'axios';
import type { ApiResponse } from '@/types/api.types';
import type { UserType } from '@/types/user.types';

class Helper {
  /**
   * Trang tiếp theo sau khi đăng nhập Google: thiếu số điện thoại / địa chỉ → bổ sung hồ sơ; chưa có mật khẩu → đặt mật
   * khẩu; đủ rồi → trang chủ.
   */
  static nextStepAfterSocialLogin(user: Pick<UserType, 'phone' | 'address' | 'hasPassword'>) {
    if (!user.phone || !user.address) return '/auth/complete-profile';
    if (user.hasPassword === false) return '/auth/set-password';
    return '/';
  }

  /** OpenStreetMap directions to a point, opened in a new tab (D-12). */
  static directionsUrl(lat: number, lng: number) {
    return `https://www.openstreetmap.org/directions?to=${lat}%2C${lng}`;
  }

  /** Joins class names, skipping falsy values. */
  static cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(' ');
  }

  /**
   * Message để hiện cho người dùng: ưu tiên message backend trả về, không có (mất mạng, timeout, response lạ) thì dùng
   * fallback.
   */
  static getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof AxiosError) {
      if (!error.response) return 'Could not reach the server. Check your connection and try again.';
      const message = (error.response.data as Partial<ApiResponse<unknown>> | undefined)?.message;
      if (message) return message;
    }
    return fallback;
  }

  /** Mã lỗi backend (error.code), vd INVALID_RESET_TOKEN; không có response thì undefined. */
  static getErrorCode(error: unknown): string | undefined {
    if (!(error instanceof AxiosError)) return undefined;
    return (error.response?.data as Partial<ApiResponse<unknown>> | undefined)?.error?.code;
  }

  /** Lỗi theo từng field (error.details của backend) → { email: '...', password: '...' }. */
  static getFieldErrors(error: unknown): Record<string, string> {
    if (!(error instanceof AxiosError)) return {};
    const details = (error.response?.data as Partial<ApiResponse<unknown>> | undefined)?.error?.details ?? [];
    return Object.fromEntries(details.filter((d) => d.field).map((d) => [d.field, d.message]));
  }
}
export default Helper;
