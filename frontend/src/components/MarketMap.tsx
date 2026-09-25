import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import '@/styles/leaflet-theme.css';
import { CITY, MAX_ZOOM, TILE_ATTRIBUTION, TILE_URL } from '@/config/map';
import { directionsUrl, resolveRemembered } from '@/lib/directions';
import Geolocation from '@/utils/geolocation';
import Helper from '@/utils/helper';

export type MapMarker = {
  lat: number;
  lng: number;
  kind: 'market' | 'stall';
  /** Name under the pin. */
  label?: string;
  /** One or two characters inside the pin head; defaults to M for a market, S for a stall. */
  text?: string;
  /** Draws the bigger outlined pin: this one is in the part of the list you are looking at. */
  selected?: boolean;
  popup?: {
    title: string;
    lines: string[];
    /** Route this pin opens in the app, e.g. `/markets/3`. */
    href?: string;
  };
};

type MarketMapProps = {
  /** Names the frame for screen readers. */
  label: string;
  markers: MapMarker[];
  /** Height and any other frame classes; the frame itself comes from `.ml-map`. */
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

/**
 * Built when the popup opens rather than when the marker is drawn, so "Directions" picks up whatever start point the
 * visitor last chose — including a location they shared after this map was rendered. A popup is plain HTML inside
 * Leaflet and cannot open the React dialog, so it silently uses that remembered choice.
 */
const popupHtml = (m: MapMarker) => {
  const p = m.popup;
  if (!p) return '';
  const geo = Geolocation.get();
  const from = resolveRemembered(geo.status === 'ready' ? geo.at : null);
  return (
    `<b>${esc(p.title)}</b>` +
    p.lines.map((l) => `<span>${esc(l)}</span><br>`).join('') +
    (p.href ? `<a href="${esc(p.href)}" data-route>Open</a>` : '') +
    `<a href="${esc(directionsUrl({ lat: m.lat, lng: m.lng }, from))}" target="_blank" rel="noopener">Directions</a>`
  );
};

/**
 * Leaflet + OpenStreetMap frame (D-12, FR-012). Pins use the design system's `.ml-pin`, so a market on the map and a
 * market in a list read as the same thing. Markers follow whatever the screen is filtered to; `selected` marks the ones
 * currently on screen in the list beside it.
 */
const MarketMap = ({ label, markers, className, center, zoom, scrollWheelZoom = true }: MarketMapProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const navigate = useNavigate();
  /** Tiles come over the network, so losing them is a state this frame has to be able to show (FR-084). */
  const [tilesFailed, setTilesFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // Leaflet takes over the element it is given, so it gets a child of the frame rather than the frame itself.
    const inner = document.createElement('div');
    host.appendChild(inner);
    const map = L.map(inner, { scrollWheelZoom, zoomControl: true, attributionControl: true });
    const tiles = L.tileLayer(TILE_URL, { maxZoom: MAX_ZOOM, attribution: TILE_ATTRIBUTION }).addTo(map);
    // A tile 404s at the edge of the world as well, so the note goes up on failure and comes down as soon as
    // any tile arrives, rather than latching on the first error.
    tiles.on('tileerror', () => setTilesFailed(true));
    tiles.on('load', () => setTilesFailed(false));

    // "Open" points into the app, so it navigates instead of reloading the whole page.
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
  }, [navigate, scrollWheelZoom]);

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
      if (mk.popup) marker.bindPopup(() => popupHtml(mk));
      marker.addTo(layer);
      bounds.push([mk.lat, mk.lng]);
    });

    if (center) map.setView(center, zoom ?? 13);
    else if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40] });
    else if (bounds.length === 1) map.setView(bounds[0], zoom ?? 15);
    else map.setView(CITY, 11);
  }, [markers, center, zoom]);

  // isolate: Leaflet đặt z-index 400–1000 cho các lớp bên trong; không cô lập thì chúng đè lên header sticky (z-40)
  return (
    <div role="region" aria-label={label} className={Helper.cn('ml-map isolate', className)}>
      {/* Leaflet owns this child outright; the note stays a sibling so React never fights it over the DOM. */}
      <div ref={hostRef} className="absolute inset-0" />
      {tilesFailed && (
        <p className="ml-map-note m-0">Map tiles need a connection. The list still works without them.</p>
      )}
    </div>
  );
};

export default MarketMap;
