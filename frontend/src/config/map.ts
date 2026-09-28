import type { TFunction } from 'i18next';

/**
 * Where the map gets its tiles (D-12). Leaflet only draws; the pictures come from a tile server.
 *
 * With `VITE_GOOGLE_MAPS_KEY` set the tiles are Google's (Map Tiles API, `lib/baseLayer.ts`). That key ships inside the
 * JavaScript bundle where anyone can read it. That is how browser keys work, so it is locked in the Google Cloud
 * console to our own sites and to the Map Tiles API, and a daily tile cap there keeps it inside the free allowance
 * (docs/setup.md). Never put a key that must stay secret in a `VITE_*` variable (CONTRIBUTING.md §6).
 *
 * Without a key, on a teammate's machine or a reviewer's `make up`, the map uses OpenStreetMap's own server, which
 * needs no account. It is also where a Google map falls back to when Google refuses.
 */
export const GOOGLE_MAPS_KEY: string = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';

export const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_LINK = '<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/**
 * OpenStreetMap credit line in the map's own corner, in the reader's language (`map.attribution` in common.json). May
 * contain a link, which Leaflet renders as HTML. Google's credit comes from Google instead, per area on screen.
 */
export const osmAttribution = (t: TFunction) => t('map.attribution', { link: OSM_LINK });

/**
 * The map credit as plain text, for the site footer and the About page, which render text rather than HTML. Null means
 * the OpenStreetMap credit, which both already have translated.
 */
export const MAP_CREDIT: string | null = GOOGLE_MAPS_KEY ? '© Google' : null;

export const MAX_ZOOM = 19;

/** Ho Chi Minh City. Used when there is no marker to fit the view around. */
export const CITY: [number, number] = [10.79, 106.72];
