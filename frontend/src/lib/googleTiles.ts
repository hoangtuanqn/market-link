import type L from 'leaflet';

/**
 * Google Maps Platform Map Tiles API, 2D roadmap tiles (FR-012, D-12). Three calls:
 *
 * - `createSession` fixes the look of the tiles (map type, language, region, pixel density) and returns a token that
 *   every tile request carries. It is free and lasts about two weeks, so one per language is reused across maps.
 * - `2dtiles/{z}/{x}/{y}` is the tile itself, and the only billed call: Google counts every tile.
 * - `viewport` returns the copyright line Google requires under its tiles for the area on screen. Also free.
 *
 * https://developers.google.com/maps/documentation/tile/2d-tiles-overview
 */
const API = 'https://tile.googleapis.com';

/** Google wants a region-qualified tag where the bare code is ambiguous; the app's `zh` is Simplified Chinese. */
const LANGUAGE_TAGS: Record<string, string> = { zh: 'zh-CN' };

/** Renewed this long before Google's stated expiry, so a map never starts on a token about to lapse. */
const RENEW_BEFORE_MS = 60 * 60 * 1000;

type Entry = { token: Promise<string>; expiresAt: number };

const sessions = new Map<string, Entry>();

async function createSession(
  key: string,
  language: string,
  sharp: boolean,
): Promise<{ session: string; expiry: string }> {
  const res = await fetch(`${API}/v1/createSession?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mapType: 'roadmap',
      language,
      // Borders and place names as shown in Vietnam, where every market is.
      region: 'VN',
      // 512px tiles drawn at 256px: crisp on a high-density screen, and still one billed tile each.
      ...(sharp ? { scale: 'scaleFactor2x', highDpi: true } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Map Tiles createSession failed: HTTP ${res.status}`);
  return res.json();
}

/** Session token for tiles labelled in `language` (the app's code, e.g. `vi`). */
export function googleSession(key: string, language: string): Promise<string> {
  const tag = LANGUAGE_TAGS[language] ?? language;
  const sharp = window.devicePixelRatio > 1;
  const id = `${tag}|${sharp}`;

  const cached = sessions.get(id);
  if (cached && Date.now() < cached.expiresAt) return cached.token;

  const entry: Entry = { token: Promise.resolve(''), expiresAt: Infinity };
  entry.token = createSession(key, tag, sharp).then(
    ({ session, expiry }) => {
      entry.expiresAt = Number(expiry) * 1000 - RENEW_BEFORE_MS;
      return session;
    },
    (err: unknown) => {
      // A refusal is not cached: the next map asks again rather than inheriting this failure.
      sessions.delete(id);
      throw err;
    },
  );
  sessions.set(id, entry);
  return entry.token;
}

/** Tile template for `L.tileLayer`. */
export function googleTileUrl(session: string, key: string): string {
  return `${API}/v1/2dtiles/{z}/{x}/{y}?session=${encodeURIComponent(session)}&key=${encodeURIComponent(key)}`;
}

const clampLat = (lat: number) => Math.max(-89.99, Math.min(89.99, lat));
const wrapLng = (lng: number) => {
  // Only a view panned past the antimeridian needs the arithmetic, which would otherwise add float noise to every call.
  const wrapped = lng < -180 || lng > 180 ? ((((lng + 180) % 360) + 360) % 360) - 180 : lng;
  return Math.max(-179.99, Math.min(179.99, wrapped));
};

/**
 * Copyright line for what is on screen. Google only accepts latitudes inside ±90 and longitudes inside ±180, while a
 * zoomed-out Leaflet view runs past the poles and around the world more than once, so the box is clamped and wrapped.
 */
export async function googleCopyright(
  session: string,
  key: string,
  zoom: number,
  bounds: L.LatLngBounds,
): Promise<string> {
  const wholeWorld = bounds.getEast() - bounds.getWest() >= 360;
  const query = new URLSearchParams({
    session,
    key,
    zoom: String(Math.round(zoom)),
    north: String(clampLat(bounds.getNorth())),
    south: String(clampLat(bounds.getSouth())),
    east: String(wholeWorld ? 179.99 : wrapLng(bounds.getEast())),
    west: String(wholeWorld ? -179.99 : wrapLng(bounds.getWest())),
  });
  const res = await fetch(`${API}/tile/v1/viewport?${query}`);
  if (!res.ok) throw new Error(`Map Tiles viewport failed: HTTP ${res.status}`);
  const body: { copyright?: string } = await res.json();
  return body.copyright ?? '';
}
