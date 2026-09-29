import i18n from '@/i18n';
import type { UpdateProfileInput } from '@/types/auth.types';

/** Vietnamese mobile: 10 digits, starting with 03/05/07/08/09 (the backend's RegisterRules.PHONE_REGEX). */
export const PHONE_REGEX = /^0[35789][0-9]{8}$/;

export type ProfileErrors = Partial<Record<'fullName' | 'phone', string>>;

/**
 * Full name and phone number — same rules as the backend's UpdateProfileRequest. The address has its own rules
 * (`validateAddress` in lib/address).
 */
export const validateProfile = (form: Pick<UpdateProfileInput, 'fullName' | 'phone'>): ProfileErrors => {
  const errors: ProfileErrors = {};
  const fullName = form.fullName.trim();
  const phone = form.phone.trim();
  if (!fullName) errors.fullName = i18n.t('validation.fullNameRequired');
  else if (fullName.length > 100) errors.fullName = i18n.t('validation.fullNameMax', { max: 100 });
  if (!phone) errors.phone = i18n.t('validation.phoneRequired');
  else if (!PHONE_REGEX.test(phone)) errors.phone = i18n.t('validation.phoneInvalid');
  return errors;
};
