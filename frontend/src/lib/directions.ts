import type { LatLng } from './geo';

/**
 * Directions open on Google Maps in a new tab (D-12). This is a Maps URL, a plain link rather than an API call, so it
 * needs no key and no billing account.
 *
 * Only the destination is sent. Without an origin Google starts from the device's own location, and on a phone the link
 * opens the Google Maps app; the visitor picks the travel mode there. Google's geocoder also knows Vietnamese house
 * numbers, so someone setting off from elsewhere types it on Google rather than in a form of ours.
 */
const BASE = 'https://www.google.com/maps/dir/';

export function directionsUrl(to: LatLng): string {
  const query = new URLSearchParams({ api: '1', destination: `${to.lat},${to.lng}` });
  return `${BASE}?${query}`;
}
