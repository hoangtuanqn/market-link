export type AddressParts = {
  countryCode: string;
  provinceCode?: string;
  wardCode?: string;
  streetName?: string;
  addressLine?: string;
  regionName?: string;
  cityName?: string;
};

export type AddressErrors = Partial<Record<keyof AddressParts, string>>;

export const VIETNAM = 'VN';

export const emptyAddress = (): AddressParts => ({ countryCode: VIETNAM });

export type CountryOption = { code: string; name: string };
export type ProvinceOption = { code: string; name: string; fullName: string };
export type WardOption = { code: string; name: string; fullName: string };
