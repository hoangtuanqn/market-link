import type { LatLng } from '@/lib/geo';

export type GeoFailure = 'insecure' | 'failed';

export type GeoState =
  | { status: 'idle' }
  | { status: 'asking' }
  | { status: 'ready'; at: LatLng }
  | { status: 'denied' }
  | { status: 'unavailable'; reason: GeoFailure };

const KEY = 'geo_position';
const CHANGE_EVENT = 'geo-change';

export const IDLE: GeoState = { status: 'idle' };

function load(): GeoState {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) return { status: 'ready', at: JSON.parse(raw) as LatLng };
  } catch {
    // Private windows and blocked site data both throw here; starting from idle is the right fallback.
  }
  return IDLE;
}

let state: GeoState = load();

let pending: Promise<GeoState> | null = null;

const set = (next: GeoState) => {
  state = next;
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

class Geolocation {
  static get(): GeoState {
    return state;
  }

  static subscribe(callback: () => void) {
    window.addEventListener(CHANGE_EVENT, callback);
    return () => window.removeEventListener(CHANGE_EVENT, callback);
  }

  static request(): Promise<GeoState> {
    if (pending) return pending;

    if (!window.isSecureContext || !('geolocation' in navigator)) {
      set({ status: 'unavailable', reason: 'insecure' });
      return Promise.resolve(state);
    }

    set({ status: 'asking' });
    pending = new Promise<GeoState>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const at = { lat: position.coords.latitude, lng: position.coords.longitude };
          try {
            sessionStorage.setItem(KEY, JSON.stringify(at));
          } catch {
            // Not being able to remember it is survivable; the position still works for this page.
          }
          set({ status: 'ready', at });
          resolve(state);
        },
        (error) => {
          set(
            error.code === error.PERMISSION_DENIED ? { status: 'denied' } : { status: 'unavailable', reason: 'failed' },
          );
          resolve(state);
        },
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
      );
    }).finally(() => {
      pending = null;
    });
    return pending;
  }

  static clear() {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      // Nothing to clear.
    }
    set(IDLE);
  }
}

export default Geolocation;
