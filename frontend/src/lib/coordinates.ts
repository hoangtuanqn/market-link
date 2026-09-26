/** One coordinate as typed: "10.7725" → 10.7725; blank or not a plain number → null. */
export const parseCoordinate = (text: string): number | null => {
  const trimmed = text.trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return null;
  return Number(trimmed);
};

/**
 * "10.7725, 106.698" — the way OpenStreetMap, Google Maps and most chat answers hand out a location — into both numbers
 * at once. Anything else → null.
 */
export const parseCoordinatePair = (text: string): { lat: number; lng: number } | null => {
  // Two numbers separated by a comma, a semicolon or plain spaces.
  const match = text.trim().match(/^(-?\d+(?:\.\d+)?)\s*(?:[,;]\s*|\s+)(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  return { lat, lng };
};

export const isLatitude = (value: number) => Number.isFinite(value) && Math.abs(value) <= 90;

export const isLongitude = (value: number) => Number.isFinite(value) && Math.abs(value) <= 180;
