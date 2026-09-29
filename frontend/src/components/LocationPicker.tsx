import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import '@/styles/leaflet-theme.css';
import { CITY, MAX_ZOOM, TILE_URL, tileAttribution } from '@/config/map';
import Helper from '@/utils/helper';

const pinHtml = (kind: 'market' | 'stall', label: string, text: string, selected?: boolean) =>
  `<span class="ml-pin ml-pin-${kind}${selected ? ' ml-pin-selected' : ''}">` +
  `<span class="ml-pin-head">${text}</span>` +
  '<span class="ml-pin-stem"></span><span class="ml-pin-dot"></span>' +
  `<span class="ml-pin-label">${label}</span></span>`;

type LocationPickerProps = {
  label: string;
  className?: string;
  lat: number;
  lng: number;
  onMove: (lat: number, lng: number) => void;
  pinLabel?: string;
  market?: { lat: number; lng: number; name: string };
  focusToken?: number;
};

const LocationPicker = ({
  label,
  className,
  lat,
  lng,
  onMove,
  pinLabel: pinLabelProp,
  market,
  focusToken,
}: LocationPickerProps) => {
  const { t } = useTranslation();
  const pinLabel = pinLabelProp ?? t('map.yourStall');
  const attribution = tileAttribution(t);
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
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
    L.tileLayer(TILE_URL, { maxZoom: MAX_ZOOM, attribution }).addTo(map);
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
    mapRef.current = map;

    const resize = window.setTimeout(() => map.invalidateSize(), 50);

    return () => {
      window.clearTimeout(resize);
      map.remove();
      inner.remove();
      pinRef.current = null;
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketLat, marketLng, marketName, pinLabel, attribution]);

  useEffect(() => {
    const map = mapRef.current;
    const pin = pinRef.current;
    if (!map || !pin || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    pin.setLatLng([lat, lng]);
    if (!map.getBounds().contains([lat, lng])) map.panTo([lat, lng]);
  }, [lat, lng]);

  useEffect(() => {
    if (focusToken === undefined) return;
    mapRef.current?.setView([lat, lng], 13);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusToken]);

  return <div ref={hostRef} role="region" aria-label={label} className={Helper.cn('ml-map isolate', className)} />;
};

export default LocationPicker;
