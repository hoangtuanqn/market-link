/** Geography helpers. Distances are straight-line; the road distance is whatever OSM directions says. */

export type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_KM = 6371;
const rad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Great-circle distance in kilometres (haversine). Accurate to a few metres across a city, which is all "2.4 km away"
 * needs. It is the distance a bird flies, not the distance you ride, so it is only ever used for sorting and for a
 * rough figure on a card — never presented as a journey length.
 */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** 0.62 → "620 m", 2.43 → "2.4 km". Decimals use a point, per the design system's Voice section. */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}
