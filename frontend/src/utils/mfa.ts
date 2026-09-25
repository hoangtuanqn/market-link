import type { AuthResultType, LoginResultType } from '@/types/auth.types';

/** FR-008: thông tin màn nhập mã cần, truyền qua router state (không lưu storage: F5 thì đăng nhập lại). */
export type PendingMfa = {
  mfaToken: string;
  email: string;
  /** Lựa chọn "Remember me" ở bước mật khẩu: lưu phiên vào localStorage hay sessionStorage sau khi nhập mã. */
  remember: boolean;
};

/**
 * Kết quả đăng nhập: `pending` khi admin đã bật xác thực hai bước (chưa có phiên), `session` khi đã có accessToken.
 * Dùng chung cho trang đăng nhập admin, trang đăng nhập thường và đăng nhập Google.
 */
export function splitLoginResult(
  data: LoginResultType,
  remember: boolean,
): { pending: PendingMfa; session: null } | { pending: null; session: AuthResultType } {
  if (data.mfaRequired && data.mfaToken) {
    return { pending: { mfaToken: data.mfaToken, email: data.user.email, remember }, session: null };
  }
  return { pending: null, session: { accessToken: data.accessToken ?? '', user: data.user } };
}
