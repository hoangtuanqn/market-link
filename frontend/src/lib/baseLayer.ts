import type { TFunction } from 'i18next';
import L from 'leaflet';
import { GOOGLE_MAPS_KEY, MAX_ZOOM, OSM_TILE_URL, osmAttribution } from '@/config/map';
import { googleCopyright, googleSession, googleTileUrl } from './googleTiles';

type BaseLayerOptions = {
  t: TFunction;
  /** The reader's language, e.g. `vi`: Google draws its street and place names in it. */
  language: string;
  /** Tiles failing (true) or arriving again (false), for the frame's "tiles need a connection" note (FR-084). */
  onTiles?: (failed: boolean) => void;
};

/**
 * Failures in a row that mean Google has stopped serving (the daily tile cap is spent, the key was revoked or billing
 * switched off) rather than one tile going missing. A tile that loads resets the count.
 */
const GIVE_UP_AFTER = 4;

/** Panning fires moveend in bursts; the copyright is asked for once the view has settled. */
const CREDIT_DELAY_MS = 300;

/** Google's own logo file, unmodified, as its attribution rules require (public/images/google-maps-logo.svg). */
const LOGO_SRC = '/images/google-maps-logo.svg';

/** Once Google has failed in this tab, later maps go straight to OpenStreetMap instead of failing the same way. */
let googleDown = false;

/**
 * The one trace left when a configured key is not working: the map itself looks fine, just not like Google. Said once
 * per tab, although every map waiting on the same refused session lands here.
 */
const giveUpOnGoogle = (reason: unknown) => {
  if (!googleDown) {
    console.warn('Google Maps tiles are unavailable, showing OpenStreetMap instead (docs/setup.md §8).', reason);
  }
  googleDown = true;
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Lays the base map under `map` (D-12): Google's roadmap tiles when a key is configured, OpenStreetMap otherwise, and
 * OpenStreetMap again whenever Google refuses, so a demo never shows a blank frame. With Google come the two things its
 * terms ask for: the Google Maps logo bottom left and Google's copyright line for the area on screen.
 *
 * Returns a function that takes off everything this added. Asking Google for a session is asynchronous, so call it
 * before `map.remove()`; a map removed before Google answers gets nothing added.
 */
export function addBaseLayer(map: L.Map, { t, language, onTiles }: BaseLayerOptions): () => void {
  let removed = false;
  let detach = () => {};

  const watch = (layer: L.TileLayer) => layer.on('tileerror', () => onTiles?.(true)).on('load', () => onTiles?.(false));

  const showOsm = () => {
    const layer = watch(L.tileLayer(OSM_TILE_URL, { maxZoom: MAX_ZOOM, attribution: osmAttribution(t) })).addTo(map);
    detach = () => layer.remove();
  };

  const showGoogle = (session: string) => {
    const key = GOOGLE_MAPS_KEY;
    const layer = watch(L.tileLayer(googleTileUrl(session, key), { maxZoom: MAX_ZOOM }));
    const logo = new L.Control({ position: 'bottomleft' });
    logo.onAdd = () => {
      const img = L.DomUtil.create('img', 'ml-map-google-logo');
      img.src = LOGO_SRC;
      img.alt = 'Google Maps';
      return img;
    };

    let active = true;
    let credit = '';
    let timer: number | undefined;
    let failures = 0;

    const setCredit = (next: string) => {
      if (credit) map.attributionControl?.removeAttribution(credit);
      credit = next ? esc(next) : '';
      if (credit) map.attributionControl?.addAttribution(credit);
    };
    const refreshCredit = () => {
      googleCopyright(session, key, map.getZoom(), map.getBounds()).then(
        (next) => {
          if (active) setCredit(next);
        },
        // The previous line stays up; the next pan asks again.
        () => {},
      );
    };
    const onMove = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(refreshCredit, CREDIT_DELAY_MS);
    };

    const stop = () => {
      active = false;
      window.clearTimeout(timer);
      map.off('moveend', onMove);
      setCredit('');
      logo.remove();
      layer.remove();
    };

    layer.on('tileload', () => {
      failures = 0;
    });
    layer.on('tileerror', () => {
      // A tile already in flight can still report after the switch; it must not switch a second time.
      if (!active) return;
      failures += 1;
      if (failures < GIVE_UP_AFTER) return;
      giveUpOnGoogle(`${GIVE_UP_AFTER} tiles in a row failed to load`);
      stop();
      showOsm();
    });

    layer.addTo(map);
    logo.addTo(map);
    map.on('moveend', onMove);
    map.whenReady(refreshCredit);
    detach = stop;
  };

  if (!GOOGLE_MAPS_KEY || googleDown) {
    showOsm();
  } else {
    googleSession(GOOGLE_MAPS_KEY, language).then(
      (session) => {
        if (!removed) showGoogle(session);
      },
      (err: unknown) => {
        giveUpOnGoogle(err);
        if (!removed) showOsm();
      },
    );
  }

  return () => {
    removed = true;
    detach();
  };
}
