import { describe, expect, it } from 'vitest';
import { directionsUrl } from './directions';

describe('directionsUrl (FR-013, D-12)', () => {
  it('opens Google Maps directions to the pin', () => {
    const url = new URL(directionsUrl({ lat: 10.7769, lng: 106.7009 }));

    expect(`${url.origin}${url.pathname}`).toBe('https://www.google.com/maps/dir/');
    expect(url.searchParams.get('api')).toBe('1');
    expect(url.searchParams.get('destination')).toBe('10.7769,106.7009');
  });

  /**
   * Leaving the origin out is what makes Google start from the device's own location, and leaving the mode out lets the
   * visitor pick it there. Setting either would override what Google already knows better than we do.
   */
  it('sends no origin and no travel mode', () => {
    const url = new URL(directionsUrl({ lat: 10.7769, lng: 106.7009 }));

    expect(url.searchParams.has('origin')).toBe(false);
    expect(url.searchParams.has('travelmode')).toBe(false);
  });
});
