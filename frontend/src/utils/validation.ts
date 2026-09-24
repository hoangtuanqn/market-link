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
  if (!fullName) errors.fullName = 'Enter your full name.';
  else if (fullName.length > 100) errors.fullName = 'Full name can be at most 100 characters.';
  if (!phone) errors.phone = 'Enter your phone number.';
  else if (!PHONE_REGEX.test(phone)) errors.phone = 'Enter a valid Vietnamese mobile number (10 digits).';
  if (!address) errors.address = 'Enter your address.';
  else if (address.length > 255) errors.address = 'Address can be at most 255 characters.';
  return errors;
};
