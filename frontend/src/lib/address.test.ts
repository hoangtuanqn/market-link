import { describe, expect, it } from 'vitest';
import type { AddressParts } from '@/types/address.types';
import { addressErrorsFrom, cleanAddress, sameAddress, validateAddress } from './address';

const benThanh: AddressParts = {
  countryCode: 'VN',
  provinceCode: '79',
  wardCode: '26743',
  streetName: 'Lê Lợi',
  addressLine: '12',
};

const tokyo: AddressParts = {
  countryCode: 'JP',
  regionName: 'Tokyo',
  cityName: 'Shibuya',
  addressLine: '1-2-3 Jingumae',
};

describe('validateAddress (FR-001, same rules as AddressService)', () => {
  it('accepts a complete Vietnamese address', () => {
    expect(validateAddress(benThanh)).toEqual({});
  });

  it('asks for the ward when it is missing', () => {
    const errors = validateAddress({ ...benThanh, wardCode: undefined });

    expect(Object.keys(errors)).toEqual(['wardCode']);
    expect(errors.wardCode).toBe('Choose a ward or commune.');
  });

  it('asks for the country, province and street of a Vietnamese address', () => {
    expect(validateAddress({ countryCode: '' })).toHaveProperty('countryCode');
    expect(validateAddress({ ...benThanh, provinceCode: '' })).toHaveProperty('provinceCode');
    expect(validateAddress({ ...benThanh, streetName: '   ' })).toHaveProperty('streetName');
  });

  it('asks for region, city and details abroad', () => {
    const errors = validateAddress({ countryCode: 'JP' });

    expect(Object.keys(errors).sort()).toEqual(['addressLine', 'cityName', 'regionName']);
  });

  it('lets a market leave the house number out', () => {
    expect(validateAddress({ ...benThanh, addressLine: '' }, { lineRequired: false })).toEqual({});
    expect(validateAddress({ ...benThanh, addressLine: '' })).toHaveProperty('addressLine');
  });

  it('flags parts longer than their column', () => {
    expect(validateAddress({ ...benThanh, streetName: 'x'.repeat(101) })).toHaveProperty('streetName');
    expect(validateAddress({ ...benThanh, addressLine: 'x'.repeat(61) })).toHaveProperty('addressLine');
    expect(validateAddress({ ...tokyo, cityName: 'x'.repeat(61) })).toHaveProperty('cityName');
  });
});

describe('addressErrorsFrom', () => {
  it('maps the server field names onto the address parts', () => {
    expect(
      addressErrorsFrom({
        'addressParts.wardCode': 'Choose a ward or commune.',
        phone: 'This phone number is already registered.',
      }),
    ).toEqual({ wardCode: 'Choose a ward or commune.' });
  });

  it('puts an error about the whole address on the country', () => {
    expect(addressErrorsFrom({ addressParts: 'Choose your address.' })).toEqual({
      countryCode: 'Choose your address.',
    });
  });
});

describe('cleanAddress', () => {
  it('drops the Vietnamese parts from a foreign address and trims the rest', () => {
    expect(
      cleanAddress({ ...tokyo, provinceCode: '79', wardCode: '26743', streetName: 'Lê Lợi', cityName: ' Shibuya ' }),
    ).toEqual(tokyo);
  });

  it('drops the foreign parts from a Vietnamese address and leaves empty parts out', () => {
    expect(cleanAddress({ ...benThanh, regionName: 'Tokyo', addressLine: '  ' })).toEqual({
      countryCode: 'VN',
      provinceCode: '79',
      wardCode: '26743',
      streetName: 'Lê Lợi',
    });
  });
});

describe('sameAddress', () => {
  it('ignores surrounding whitespace and parts of the other country', () => {
    expect(sameAddress(benThanh, { ...benThanh, streetName: ' Lê Lợi ', regionName: 'Tokyo' })).toBe(true);
  });

  it('tells a different ward apart', () => {
    expect(sameAddress(benThanh, { ...benThanh, wardCode: '26737' })).toBe(false);
  });

  it('treats no address on both sides as the same', () => {
    expect(sameAddress(undefined, undefined)).toBe(true);
    expect(sameAddress(undefined, benThanh)).toBe(false);
  });
});
