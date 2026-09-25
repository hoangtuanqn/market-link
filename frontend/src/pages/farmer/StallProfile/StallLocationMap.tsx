import L from 'leaflet';
import { useEffect, useRef } from 'react';
import '@/styles/leaflet-theme.css';
import Helper from '@/utils/helper';

const pinHtml = (kind: 'market' | 'stall', label: string, text: string, selected?: boolean) =>
  `<span class="ml-pin ml-pin-${kind}${selected ? ' ml-pin-selected' : ''}">` +
  `<span class="ml-pin-head">${text}</span>` +
  '<span class="ml-pin-stem"></span><span class="ml-pin-dot"></span>' +
  `<span class="ml-pin-label">${label}</span></span>`;

type StallLocationMapProps = {
  label: string;
  className?: string;
  marketLat: number;
  marketLng: number;
  marketName: string;
  stallLat: number;
  stallLng: number;
  onMove: (lat: number, lng: number) => void;
};

/** Round, draggable stall pin next to the square market pin — drop the pin at your spot inside the market. */
const StallLocationMap = ({
  label,
  className,
  marketLat,
  marketLng,
  marketName,
  stallLat,
  stallLng,
  onMove,
}: StallLocationMapProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const stallMarkerRef = useRef<L.Marker | null>(null);
  const onMoveRef = useRef(onMove);
  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const inner = document.createElement('div');
    host.appendChild(inner);
    const map = L.map(inner, { zoomControl: true, attributionControl: true, scrollWheelZoom: false });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    map.setView([marketLat, marketLng], 17);

    L.marker([marketLat, marketLng], {
      icon: L.divIcon({
        html: pinHtml('market', marketName, 'M'),
        className: '',
        iconSize: [34, 48],
        iconAnchor: [17, 48],
      }),
      title: marketName,
    }).addTo(map);

    const stallMarker = L.marker([stallLat, stallLng], {
      draggable: true,
      icon: L.divIcon({
        html: pinHtml('stall', 'Your stall', 'S', true),
        className: '',
        iconSize: [34, 48],
        iconAnchor: [17, 48],
      }),
      title: 'Your stall',
    }).addTo(map);
    stallMarker.on('dragend', () => {
      const ll = stallMarker.getLatLng();
      onMoveRef.current(ll.lat, ll.lng);
    });
    stallMarkerRef.current = stallMarker;

    const resize = window.setTimeout(() => map.invalidateSize(), 50);

    return () => {
      window.clearTimeout(resize);
      map.remove();
      inner.remove();
      stallMarkerRef.current = null;
    };
    // Only the market changes recreate the map; stall moves are applied to the existing marker below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketLat, marketLng, marketName]);

  // Keeps the pin in sync when the coordinates change from outside a drag (typing lat/lng, "use the market's location").
  useEffect(() => {
    stallMarkerRef.current?.setLatLng([stallLat, stallLng]);
  }, [stallLat, stallLng]);

  return <div ref={hostRef} role="region" aria-label={label} className={Helper.cn('ml-map isolate', className)} />;
};

export default StallLocationMap;
