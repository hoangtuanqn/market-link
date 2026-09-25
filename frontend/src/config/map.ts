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
const OSM_ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Tile template Leaflet fills in with z/x/y. */
export const TILE_URL = import.meta.env.VITE_MAP_TILE_URL || OSM_TILE_URL;

/** Credit line in the map's own corner. May contain a link, which Leaflet renders as HTML. */
export const TILE_ATTRIBUTION = import.meta.env.VITE_MAP_ATTRIBUTION || OSM_ATTRIBUTION;

/**
 * The same credit as plain text, for the site footer, which renders text rather than HTML. Every provider requires the
 * credit somewhere; keeping it derived means a new provider only has to be named once, in the environment.
 */
export const MAP_CREDIT = TILE_ATTRIBUTION.replace(/<[^>]*>/g, '');

export const MAX_ZOOM = 19;

/** Ho Chi Minh City. Used when there is no marker to fit the view around. */
export const CITY: [number, number] = [10.79, 106.72];
