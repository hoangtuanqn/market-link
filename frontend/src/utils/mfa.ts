import type { AuthResultType, LoginResultType } from '@/types/auth.types';

export type PendingMfa = {
  mfaToken: string;
  email: string;
  remember: boolean;
};

export function splitLoginResult(
  data: LoginResultType,
  remember: boolean,
): { pending: PendingMfa; session: null } | { pending: null; session: AuthResultType } {
  if (data.mfaRequired && data.mfaToken) {
    return { pending: { mfaToken: data.mfaToken, email: data.user.email, remember }, session: null };
  }
  return { pending: null, session: { accessToken: data.accessToken ?? '', user: data.user } };
}
