import Helper from '@/utils/helper';

export const CODE_REGEX = /^\d{6}$/;
export const codeInputClass = 'text-center font-mono text-[28px] tracking-[0.32em]';

export const codeError = (error: unknown, fallback: string) => {
  const message = Helper.getErrorMessage(error, fallback);
  if (Helper.getErrorCode(error) === 'MFA_CODE_INVALID') {
    return `${message} ${Helper.getFieldErrors(error).code ?? ''}`.trim();
  }
  return Helper.getFieldErrors(error).code ?? message;
};
