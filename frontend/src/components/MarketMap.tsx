import type { TFunction } from 'i18next';
import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import '@/styles/leaflet-theme.css';
import { CITY, MAX_ZOOM, TILE_URL, tileAttribution } from '@/config/map';
import { directionsUrl, resolveRemembered } from '@/lib/directions';
import Geolocation from '@/utils/geolocation';
import Helper from '@/utils/helper';

export type MapMarker = {
  lat: number;
  lng: number;
  kind: 'market' | 'stall';
  label?: string;
  text?: string;
  selected?: boolean;
  popup?: {
    title: string;
    lines: string[];
    href?: string;
  };
};

type MarketMapProps = {
  label: string;
  markers: MapMarker[];
  className?: string;
  center?: [number, number];
  zoom?: number;
  scrollWheelZoom?: boolean;
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const pinHtml = ({ kind, label, text, selected }: MapMarker) =>
  `<span class="ml-pin ml-pin-${kind}${selected ? ' ml-pin-selected' : ''}">` +
  `<span class="ml-pin-head">${esc(text || (kind === 'market' ? 'M' : 'S'))}</span>` +
  '<span class="ml-pin-stem"></span><span class="ml-pin-dot"></span>' +
  (label ? `<span class="ml-pin-label">${esc(label)}</span>` : '') +
  '</span>';

const popupHtml = (m: MapMarker, t: TFunction) => {
  const p = m.popup;
  if (!p) return '';
  const geo = Geolocation.get();
  const from = resolveRemembered(geo.status === 'ready' ? geo.at : null);
  return (
    `<b>${esc(p.title)}</b>` +
    p.lines.map((l) => `<span>${esc(l)}</span><br>`).join('') +
    (p.href ? `<a href="${esc(p.href)}" data-route>${esc(t('map.open'))}</a>` : '') +
    `<a href="${esc(directionsUrl({ lat: m.lat, lng: m.lng }, from))}" target="_blank" rel="noopener">${esc(t('actions.directions'))}</a>`
  );
};

const MarketMap = ({ label, markers, className, center, zoom, scrollWheelZoom = true }: MarketMapProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const navigate = useNavigate();
  const [tilesFailed, setTilesFailed] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const inner = document.createElement('div');
    host.appendChild(inner);
    const map = L.map(inner, { scrollWheelZoom, zoomControl: true, attributionControl: true });
    const tiles = L.tileLayer(TILE_URL, { maxZoom: MAX_ZOOM, attribution: tileAttribution(t) }).addTo(map);
    tiles.on('tileerror', () => setTilesFailed(true));
    tiles.on('load', () => setTilesFailed(false));

    map.on('popupopen', (e: L.PopupEvent) => {
      e.popup
        .getElement()
        ?.querySelector<HTMLAnchorElement>('a[data-route]')
        ?.addEventListener('click', (ev) => {
          ev.preventDefault();
          navigate(ev.currentTarget instanceof HTMLAnchorElement ? ev.currentTarget.getAttribute('href') || '/' : '/');
        });
    });

    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    const resize = window.setTimeout(() => map.invalidateSize(), 50);

    return () => {
      window.clearTimeout(resize);
      map.remove();
      inner.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, [navigate, scrollWheelZoom, t]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    const bounds: [number, number][] = [];
    markers.forEach((mk) => {
      const icon = L.divIcon({
        html: pinHtml(mk),
        className: '',
        iconSize: [34, 48],
        iconAnchor: [17, 48],
        popupAnchor: [0, -46],
      });
      const marker = L.marker([mk.lat, mk.lng], { icon, title: mk.label ?? '' });
      if (mk.popup) marker.bindPopup(() => popupHtml(mk, t));
      marker.addTo(layer);
      bounds.push([mk.lat, mk.lng]);
    });

    if (center) map.setView(center, zoom ?? 13);
    else if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40] });
    else if (bounds.length === 1) map.setView(bounds[0], zoom ?? 15);
    else map.setView(CITY, 11);
  }, [markers, center, zoom, t]);

  return (
    <div role="region" aria-label={label} className={Helper.cn('ml-map isolate', className)}>
      <div ref={hostRef} className="absolute inset-0" />
      {tilesFailed && <p className="ml-map-note m-0">{t('map.tilesFailed')}</p>}
    </div>
  );
};

export default MarketMap;
