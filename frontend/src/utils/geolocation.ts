import type { LatLng } from '@/lib/geo';

/**
 * Where the browser thinks the visitor is (FR-010, FR-013).
 *
 * Shared through one module-level value rather than per-component state, the same way `Session` works, so the markets
 * list and a directions dialog never disagree about where you are or ask for permission twice.
 *
 * Nothing here runs on its own: `request()` is only ever called from a click. Asking for someone's location the moment
 * a page loads is the pattern browsers penalise and people refuse, and a refusal is permanent until they go and change
 * it in site settings.
 */
export type GeoFailure = 'insecure' | 'failed';

export type GeoState =
  | { status: 'idle' }
  | { status: 'asking' }
  | { status: 'ready'; at: LatLng }
  /** The person said no. Nothing we can do from JavaScript; they have to change it in site settings. */
  | { status: 'denied' }
  /** `insecure`: served over plain http. `failed`: the device could not fix a position. Worded by `geo.<reason>`. */
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

/** Held for the tab only: a position from last week is worse than no position at all. */
let state: GeoState = load();

/** One in-flight request at a time: two buttons pressed together must not raise two permission prompts. */
let pending: Promise<GeoState> | null = null;

const set = (next: GeoState) => {
  state = next;
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

class Geolocation {
  /** Stable reference between renders, as `useSyncExternalStore` requires. */
  static get(): GeoState {
    return state;
  }

  static subscribe(callback: () => void) {
    window.addEventListener(CHANGE_EVENT, callback);
    return () => window.removeEventListener(CHANGE_EVENT, callback);
  }

  /**
   * Asks the browser, and resolves with the state it settled on. Returning the result means a caller can act on it
   * straight after the click instead of watching for it in an effect. Two callers asking at once share one prompt.
   */
  static request(): Promise<GeoState> {
    if (pending) return pending;

    // Geolocation is a secure-context API: over plain http it is simply absent. localhost counts as secure,
    // so this only bites a deployment served without https.
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
        // A market is hundreds of metres across, so metre-level accuracy is not worth the battery or the wait.
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
