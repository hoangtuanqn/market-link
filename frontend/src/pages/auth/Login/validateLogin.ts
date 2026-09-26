import i18n from '@/i18n';

export type LoginFieldErrors = Partial<Record<'email' | 'password', string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Client-side validation, same rules as the backend's LoginRequest. Shared by the ordinary sign-in page and the admin
 * one, so the error messages come from the Login namespace through i18n.t (no need to pass t from the calling page).
 */
const validateLogin = (email: string, password: string): LoginFieldErrors => {
  const errors: LoginFieldErrors = {};
  if (!email.trim()) errors.email = i18n.t('errors.emailRequired', { ns: 'Login' });
  else if (!EMAIL_REGEX.test(email.trim())) errors.email = i18n.t('errors.emailInvalid', { ns: 'Login' });
  if (!password) errors.password = i18n.t('errors.passwordRequired', { ns: 'Login' });
  return errors;
};

export default validateLogin;
