import { useSyncExternalStore } from 'react';
import Geolocation, { IDLE, type GeoState } from '@/utils/geolocation';

const serverSnapshot = (): GeoState => IDLE;

/**
 * Where the browser thinks you are, shared across every screen. `request` asks for permission and must only ever be
 * called from something the visitor clicked.
 */
const useGeolocation = () => {
  const state = useSyncExternalStore(Geolocation.subscribe, Geolocation.get, serverSnapshot);
  return { state, request: Geolocation.request, clear: Geolocation.clear };
};

export default useGeolocation;
