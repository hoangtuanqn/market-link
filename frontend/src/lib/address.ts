import i18n from '@/i18n';
import { VIETNAM, type AddressErrors, type AddressParts } from '@/types/address.types';

/** Column sizes of V20260927002; the server's AddressPartsRequest has the same limits. */
const MAX = { streetName: 100, addressLine: 60, regionName: 60, cityName: 60 } as const;

const VIETNAM_PARTS = ['provinceCode', 'wardCode', 'streetName'] as const;
const FOREIGN_PARTS = ['regionName', 'cityName'] as const;

const text = (value: string | undefined) => value?.trim().replace(/\s+/g, ' ') ?? '';

/**
 * The address as it will be sent: parts trimmed, empty ones left out, and parts of the other kind of address dropped (a
 * ward means nothing once the country is Japan).
 */
export function cleanAddress(parts: AddressParts): AddressParts {
  const countryCode = text(parts.countryCode).toUpperCase();
  const keep = countryCode === VIETNAM ? VIETNAM_PARTS : FOREIGN_PARTS;
  const out: AddressParts = { countryCode };
  for (const key of [...keep, 'addressLine'] as const) {
    const value = text(parts[key]);
    if (value) out[key] = value;
  }
  return out;
}

/** Client-side copy of AddressService's rules, so the form answers before a round trip (FR-001, FR-073). */
export function validateAddress(parts: AddressParts, { lineRequired = true } = {}): AddressErrors {
  const a = cleanAddress(parts);
  const errors: AddressErrors = {};
  const tooLong = (key: keyof typeof MAX) => {
    if ((a[key]?.length ?? 0) > MAX[key]) errors[key] = i18n.t('address.errors.tooLong', { max: MAX[key] });
  };

  if (!a.countryCode) {
    errors.countryCode = i18n.t('address.errors.countryRequired');
    return errors;
  }
  if (a.countryCode === VIETNAM) {
    if (!a.provinceCode) errors.provinceCode = i18n.t('address.errors.provinceRequired');
    if (!a.wardCode) errors.wardCode = i18n.t('address.errors.wardRequired');
    if (!a.streetName) errors.streetName = i18n.t('address.errors.streetRequired');
    tooLong('streetName');
  } else {
    if (!a.regionName) errors.regionName = i18n.t('address.errors.regionRequired');
    if (!a.cityName) errors.cityName = i18n.t('address.errors.cityRequired');
    tooLong('regionName');
    tooLong('cityName');
  }
  if (!a.addressLine && lineRequired) errors.addressLine = i18n.t('address.errors.lineRequired');
  tooLong('addressLine');
  return errors;
}

/**
 * Server errors arrive as `addressParts.wardCode`; the fields know them as `wardCode`. An error about the address as a
 * whole (`addressParts`) is shown on the first field, the country.
 */
export function addressErrorsFrom(fieldErrors: Record<string, string>): AddressErrors {
  const errors: AddressErrors = {};
  for (const [field, message] of Object.entries(fieldErrors)) {
    if (field === 'addressParts') errors.countryCode = message;
    else if (field.startsWith('addressParts.'))
      errors[field.slice('addressParts.'.length) as keyof AddressParts] = message;
  }
  return errors;
}

/** Whether two addresses would save the same thing — for "nothing changed" on the profile form. */
export function sameAddress(a: AddressParts | undefined, b: AddressParts | undefined): boolean {
  if (!a || !b) return !a && !b;
  return JSON.stringify(cleanAddress(a)) === JSON.stringify(cleanAddress(b));
}
