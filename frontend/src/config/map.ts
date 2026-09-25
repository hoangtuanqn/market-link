import type { TFunction } from 'i18next';

/**
 * Where the map gets its tiles (D-12). Leaflet only draws; the pictures come from a tile server, and that server is the
 * one thing about the map that changes between a demo and a real deployment.
 *
 * The default is OpenStreetMap's own server. It needs no account and normal interactive browsing is exactly what their
 * tile policy allows, so it is right for development and for the submitted demo. What it does not come with is any
 * promise of uptime: the OSM Foundation says access can be withdrawn at any time. Anything carrying real traffic should
 * point `VITE_MAP_TILE_URL` at a provider of its own.
 *
 * A tile URL usually carries an API key, and that key ships inside the JavaScript bundle where anyone can read it. That
 * is not a leak to fix, it is how browser keys work — so lock the key to your domains in the provider's dashboard and
 * treat it as public. Never put a key that must stay secret in a `VITE_*` variable (CONTRIBUTING.md §6).
 */

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_LINK = '<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/** Tile template Leaflet fills in with z/x/y. */
export const TILE_URL = import.meta.env.VITE_MAP_TILE_URL || OSM_TILE_URL;

/** The provider's own credit line, when one is configured. Provider names are not translated, so it is used as is. */
const CUSTOM_ATTRIBUTION: string = import.meta.env.VITE_MAP_ATTRIBUTION || '';

/**
 * Credit line in the map's own corner. May contain a link, which Leaflet renders as HTML. Without a configured provider
 * it is the OpenStreetMap credit in the reader's language (`map.attribution` in common.json).
 */
export const tileAttribution = (t: TFunction) => CUSTOM_ATTRIBUTION || t('map.attribution', { link: OSM_LINK });

/**
 * The configured credit as plain text, for the site footer, which renders text rather than HTML. Null means the default
 * OpenStreetMap credit, which the footer already has translated (`footer.mapData`).
 */
export const MAP_CREDIT: string | null = CUSTOM_ATTRIBUTION ? CUSTOM_ATTRIBUTION.replace(/<[^>]*>/g, '') : null;

export const MAX_ZOOM = 19;

/** Ho Chi Minh City. Used when there is no marker to fit the view around. */
export const CITY: [number, number] = [10.79, 106.72];
