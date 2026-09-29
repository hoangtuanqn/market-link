export const parseCoordinate = (text: string): number | null => {
  const trimmed = text.trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return null;
  return Number(trimmed);
};

export const parseCoordinatePair = (text: string): { lat: number; lng: number } | null => {
  const match = text.trim().match(/^(-?\d+(?:\.\d+)?)\s*(?:[,;]\s*|\s+)(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  return { lat, lng };
};

export const isLatitude = (value: number) => Number.isFinite(value) && Math.abs(value) <= 90;

export const isLongitude = (value: number) => Number.isFinite(value) && Math.abs(value) <= 180;
