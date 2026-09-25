import i18n from '@/i18n';
import type { UpdateProfileInput } from '@/types/auth.types';

/** Di động Việt Nam: 10 số, đầu 03/05/07/08/09 (RegisterRules.PHONE_REGEX của backend). */
export const PHONE_REGEX = /^0[35789][0-9]{8}$/;

export type ProfileErrors = Partial<Record<keyof UpdateProfileInput, string>>;

/** Họ tên, số điện thoại, địa chỉ — cùng luật với UpdateProfileRequest của backend. */
export const validateProfile = (form: UpdateProfileInput): ProfileErrors => {
  const errors: ProfileErrors = {};
  const fullName = form.fullName.trim();
  const phone = form.phone.trim();
  const address = form.address.trim();
  if (!fullName) errors.fullName = i18n.t('validation.fullNameRequired');
  else if (fullName.length > 100) errors.fullName = i18n.t('validation.fullNameMax', { max: 100 });
  if (!phone) errors.phone = i18n.t('validation.phoneRequired');
  else if (!PHONE_REGEX.test(phone)) errors.phone = i18n.t('validation.phoneInvalid');
  if (!address) errors.address = i18n.t('validation.addressRequired');
  else if (address.length > 255) errors.address = i18n.t('validation.addressMax', { max: 255 });
  return errors;
};
