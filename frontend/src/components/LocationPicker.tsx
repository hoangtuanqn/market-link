import L from 'leaflet';
import { useEffect, useRef } from 'react';
import '@/styles/leaflet-theme.css';
import { CITY, MAX_ZOOM, TILE_ATTRIBUTION, TILE_URL } from '@/config/map';
import Helper from '@/utils/helper';

const pinHtml = (kind: 'market' | 'stall', label: string, text: string, selected?: boolean) =>
  `<span class="ml-pin ml-pin-${kind}${selected ? ' ml-pin-selected' : ''}">` +
  `<span class="ml-pin-head">${text}</span>` +
  '<span class="ml-pin-stem"></span><span class="ml-pin-dot"></span>' +
  `<span class="ml-pin-label">${label}</span></span>`;

type LocationPickerProps = {
  label: string;
  className?: string;
  /** Latitude of the pin being placed. */
  lat: number;
  /** Longitude of the pin being placed. */
  lng: number;
  onMove: (lat: number, lng: number) => void;
  /** Name under the draggable pin. */
  pinLabel?: string;
  /** The market this pin sits in, drawn as a fixed square pin for context. Omit for a plain picker. */
  market?: { lat: number; lng: number; name: string };
};

/**
 * Drop-a-pin map: one round draggable pin, and optionally the square market pin beside it so you can see where you are
 * placing it. Used for a Farmer's stall inside a market (FR-061) and for the plot on the become-a-Farmer application.
 */
const LocationPicker = ({
  label,
  className,
  lat,
  lng,
  onMove,
  pinLabel = 'Your stall',
  market,
}: LocationPickerProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<L.Marker | null>(null);
  const onMoveRef = useRef(onMove);
  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  const marketLat = market?.lat;
  const marketLng = market?.lng;
  const marketName = market?.name;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const inner = document.createElement('div');
    host.appendChild(inner);
    const map = L.map(inner, { zoomControl: true, attributionControl: true, scrollWheelZoom: false });
    L.tileLayer(TILE_URL, { maxZoom: MAX_ZOOM, attribution: TILE_ATTRIBUTION }).addTo(map);
    // Centre on the market when there is one, otherwise on the pin itself; the city is the last resort.
    if (marketLat != null && marketLng != null) map.setView([marketLat, marketLng], 17);
    else map.setView(Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : CITY, 15);

    if (marketLat != null && marketLng != null && marketName) {
      L.marker([marketLat, marketLng], {
        icon: L.divIcon({
          html: pinHtml('market', marketName, 'M'),
          className: '',
          iconSize: [34, 48],
          iconAnchor: [17, 48],
        }),
        title: marketName,
      }).addTo(map);
    }

    const pin = L.marker([lat, lng], {
      draggable: true,
      icon: L.divIcon({
        html: pinHtml('stall', pinLabel, 'S', true),
        className: '',
        iconSize: [34, 48],
        iconAnchor: [17, 48],
      }),
      title: pinLabel,
    }).addTo(map);
    pin.on('dragend', () => {
      const ll = pin.getLatLng();
      onMoveRef.current(ll.lat, ll.lng);
    });
    pinRef.current = pin;

    const resize = window.setTimeout(() => map.invalidateSize(), 50);

    return () => {
      window.clearTimeout(resize);
      map.remove();
      inner.remove();
      pinRef.current = null;
    };
    // Only a change of market rebuilds the map; pin moves are applied to the existing marker below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketLat, marketLng, marketName, pinLabel]);

  // Keeps the pin in sync when the coordinates change from outside a drag (typing lat/lng, "use the market's location").
  useEffect(() => {
    pinRef.current?.setLatLng([lat, lng]);
  }, [lat, lng]);

  return <div ref={hostRef} role="region" aria-label={label} className={Helper.cn('ml-map isolate', className)} />;
};

export default LocationPicker;
