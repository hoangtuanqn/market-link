/**
 * A structured address (FR-001, FR-073) — the `addressParts` of the contract. Vietnam: province → ward → street → house
 * number (two levels since 01/07/2025). Other countries: region → city → address line.
 */
export type AddressParts = {
  /** ISO 3166-1 alpha-2, upper case. */
  countryCode: string;
  provinceCode?: string;
  wardCode?: string;
  /** Free text: the street list only suggests. */
  streetName?: string;
  /** House number and details. */
  addressLine?: string;
  regionName?: string;
  cityName?: string;
};

export type AddressErrors = Partial<Record<keyof AddressParts, string>>;

export const VIETNAM = 'VN';

/** A blank address in Vietnam, where nearly every account and every market is. */
export const emptyAddress = (): AddressParts => ({ countryCode: VIETNAM });

export type CountryOption = { code: string; name: string };
export type ProvinceOption = { code: string; name: string; fullName: string };
export type WardOption = { code: string; name: string; fullName: string };
