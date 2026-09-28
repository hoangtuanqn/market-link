import type { LatLng } from './geo';

/**
 * Directions open on openstreetmap.org in a new tab (D-12). We do not run a routing engine, and we do not geocode: OSM
 * turns a typed address into a point itself, which is why "another address" costs us nothing.
 */

const BASE = 'https://www.openstreetmap.org/directions';
const CHOICE_KEY = 'directions_start';

/** How the visitor wants to be routed. `car` covers a motorbike, which is what most people here ride. */
export type TravelMode = 'car' | 'bike' | 'foot';

/** A start point already resolved to something OSM can route from. */
export type StartPoint = { kind: 'none' } | { kind: 'current'; at: LatLng } | { kind: 'address'; text: string };

/**
 * What the visitor picked, remembered between visits. Deliberately holds no coordinates: a position from last week is
 * not where you are now, so `current` is re-resolved from the live browser position each time.
 */
export type StartChoice = { kind: 'none' } | { kind: 'current' } | { kind: 'address'; text: string };

const point = (p: LatLng) => `${p.lat},${p.lng}`;

/** Any of these in the typed text means the visitor already said which city, so we leave it alone. */
const NAMES_A_CITY = /h(o|ồ)\s*chi\s*minh|hcm|tp\.?\s*hcm|s(a|à)i\s*g(o|ò)n|saigon|th(a|à)nh\s*ph(o|ố)/i;

/**
 * Every market is in Ho Chi Minh City, but a typed address rarely says so, and OSM's geocoder searches the whole
 * country. "12 Lê Lợi, Quận 1" on its own resolves to a street in Hưng Yên, 1,400 km north, and the visitor gets a
 * plausible-looking route to the wrong end of Vietnam. Naming the city fixes that, and is skipped when they already
 * named one themselves.
 */
function anchorToCity(text: string): string {
  return NAMES_A_CITY.test(text) ? text : `${text}, Ho Chi Minh City`;
}

/**
 * With a start point OSM opens on a finished route, distance and turn list included. Without one it opens with only the
 * destination filled in and the visitor types where they are coming from, which is still useful and is what happens
 * when they decline to share their location.
 */
export function directionsUrl(to: LatLng, from: StartPoint = { kind: 'none' }, mode: TravelMode = 'car'): string {
  const dest = encodeURIComponent(point(to));
  const engine = `fossgis_osrm_${mode}`;

  if (from.kind === 'current') {
    return `${BASE}?engine=${engine}&route=${encodeURIComponent(`${point(from.at)};${point(to)}`)}`;
  }
  if (from.kind === 'address' && from.text.trim() !== '') {
    return `${BASE}?engine=${engine}&from=${encodeURIComponent(anchorToCity(from.text.trim()))}&to=${dest}`;
  }
  return `${BASE}?to=${dest}`;
}

export function rememberedChoice(): StartChoice {
  try {
    const raw = localStorage.getItem(CHOICE_KEY);
    if (raw) return JSON.parse(raw) as StartChoice;
  } catch {
    // Blocked storage just means we ask again next time.
  }
  return { kind: 'none' };
}

export function rememberChoice(choice: StartChoice) {
  try {
    localStorage.setItem(CHOICE_KEY, JSON.stringify(choice));
  } catch {
    // Not remembering is a small loss, not a failure.
  }
}

/**
 * The remembered choice turned into something routable, without asking for permission. Used by the map popups, which
 * are plain HTML inside Leaflet and cannot open a dialog: they route from the position we already have, and otherwise
 * fall back to the destination alone.
 */
export function resolveRemembered(known: LatLng | null): StartPoint {
  const choice = rememberedChoice();
  if (choice.kind === 'address') return { kind: 'address', text: choice.text };
  if (choice.kind === 'current' && known) return { kind: 'current', at: known };
  return { kind: 'none' };
}
