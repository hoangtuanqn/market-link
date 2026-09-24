# MapPin

Map marker: markets are square (`pin-market`), stalls are round (`pin-stall`). Used with Leaflet + OSM (D-12).

- In React: `<MapPin kind label selected text />`. With Leaflet: `L.divIcon({ html: MarketLink.pinHTML('stall', 'Vườn Cô Tư'), className: '', iconSize: [34, 48], iconAnchor: [17, 48] })`.
- `text` is the character inside the pin (default M for market, S for stall); pass a count when clustering.
- Only show labels on the selected pin or when zoomed in, to keep the map readable.

Preview: [reference gallery](../reference/gallery.html#c-MapPin)
