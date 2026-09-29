import type { LatLng } from './geo';

const BASE = 'https://www.openstreetmap.org/directions';
const CHOICE_KEY = 'directions_start';

export type TravelMode = 'car' | 'bike' | 'foot';

export type StartPoint = { kind: 'none' } | { kind: 'current'; at: LatLng } | { kind: 'address'; text: string };

export type StartChoice = { kind: 'none' } | { kind: 'current' } | { kind: 'address'; text: string };

const point = (p: LatLng) => `${p.lat},${p.lng}`;

const NAMES_A_CITY = /h(o|ồ)\s*chi\s*minh|hcm|tp\.?\s*hcm|s(a|à)i\s*g(o|ò)n|saigon|th(a|à)nh\s*ph(o|ố)/i;

function anchorToCity(text: string): string {
  return NAMES_A_CITY.test(text) ? text : `${text}, Ho Chi Minh City`;
}

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

export function resolveRemembered(known: LatLng | null): StartPoint {
  const choice = rememberedChoice();
  if (choice.kind === 'address') return { kind: 'address', text: choice.text };
  if (choice.kind === 'current' && known) return { kind: 'current', at: known };
  return { kind: 'none' };
}
