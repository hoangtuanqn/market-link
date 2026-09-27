import Helper from '@/utils/helper';

/** Shared by the Security page's regen/disable dialogs and the dedicated Setup 2FA page. */
export const CODE_REGEX = /^\d{6}$/;
export const codeInputClass = 'text-center font-mono text-[28px] tracking-[0.32em]';

/** Errors when sending the 6-digit code: wrong (with the attempts left), locked, or the state changed in another tab. */
export const codeError = (error: unknown, fallback: string) => {
  const message = Helper.getErrorMessage(error, fallback);
  if (Helper.getErrorCode(error) === 'MFA_CODE_INVALID') {
    return `${message} ${Helper.getFieldErrors(error).code ?? ''}`.trim();
  }
  return Helper.getFieldErrors(error).code ?? message;
};
