import { describe, expect, it } from 'vitest';
import { isLatitude, isLongitude, parseCoordinate, parseCoordinatePair } from './coordinates';

describe('parseCoordinate', () => {
  it('reads a plain decimal number, with or without a sign', () => {
    expect(parseCoordinate('10.7725')).toBe(10.7725);
    expect(parseCoordinate(' -33.8688 ')).toBe(-33.8688);
    expect(parseCoordinate('106')).toBe(106);
  });

  it('refuses blank, half-typed and non-numeric text', () => {
    expect(parseCoordinate('')).toBeNull();
    expect(parseCoordinate('10.')).toBeNull();
    expect(parseCoordinate('-')).toBeNull();
    expect(parseCoordinate('10.77a')).toBeNull();
    expect(parseCoordinate('1e3')).toBeNull();
  });
});

describe('parseCoordinatePair', () => {
  /** QA E2E v2 MARKET-ADMIN-002: a location copied from a map or a chat answer must land in both fields. */
  it('splits "lat, lng" as copied from a map', () => {
    expect(parseCoordinatePair('10.7725, 106.698')).toEqual({ lat: 10.7725, lng: 106.698 });
    expect(parseCoordinatePair('10.7725,106.698')).toEqual({ lat: 10.7725, lng: 106.698 });
    expect(parseCoordinatePair('10.7725 106.698')).toEqual({ lat: 10.7725, lng: 106.698 });
    expect(parseCoordinatePair('10.7725; 106.698')).toEqual({ lat: 10.7725, lng: 106.698 });
  });

  it('ignores a single number or anything that is not a pair', () => {
    expect(parseCoordinatePair('10.7725')).toBeNull();
    expect(parseCoordinatePair('10.7725, 106.698, 5')).toBeNull();
    expect(parseCoordinatePair('Ben Thanh market')).toBeNull();
  });
});

describe('ranges', () => {
  it('knows the valid latitude and longitude ranges', () => {
    expect(isLatitude(90)).toBe(true);
    expect(isLatitude(91)).toBe(false);
    expect(isLongitude(-180)).toBe(true);
    expect(isLongitude(180.5)).toBe(false);
    expect(isLatitude(Number.NaN)).toBe(false);
  });
});
