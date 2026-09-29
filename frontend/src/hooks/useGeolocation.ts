import { useSyncExternalStore } from 'react';
import Geolocation, { IDLE, type GeoState } from '@/utils/geolocation';

const serverSnapshot = (): GeoState => IDLE;

const useGeolocation = () => {
  const state = useSyncExternalStore(Geolocation.subscribe, Geolocation.get, serverSnapshot);
  return { state, request: Geolocation.request, clear: Geolocation.clear };
};

export default useGeolocation;
