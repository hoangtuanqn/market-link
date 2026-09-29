import i18n from '@/i18n';

export type LoginFieldErrors = Partial<Record<'email' | 'password', string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateLogin = (email: string, password: string): LoginFieldErrors => {
  const errors: LoginFieldErrors = {};
  if (!email.trim()) errors.email = i18n.t('errors.emailRequired', { ns: 'Login' });
  else if (!EMAIL_REGEX.test(email.trim())) errors.email = i18n.t('errors.emailInvalid', { ns: 'Login' });
  if (!password) errors.password = i18n.t('errors.passwordRequired', { ns: 'Login' });
  return errors;
};

export default validateLogin;
