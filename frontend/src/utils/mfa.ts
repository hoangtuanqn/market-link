import type { AuthResultType, LoginResultType } from '@/types/auth.types';

/** FR-008: what the code entry screen needs, passed through router state (not stored in storage: on F5 sign in again). */
export type PendingMfa = {
  mfaToken: string;
  email: string;
  /**
   * The "Remember me" choice at the password step: whether to keep the session in localStorage or sessionStorage after
   * the code is entered.
   */
  remember: boolean;
};

/**
 * The sign-in result: `pending` when an admin has two-step verification on (no session yet), `session` when there is
 * already an accessToken. Shared by the admin sign-in page, the ordinary sign-in page and Google sign-in.
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
