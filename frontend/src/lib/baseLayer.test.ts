import L from 'leaflet';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';

const OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const GOOGLE = 'https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=S1&key=test-key';

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

/** Google answering both calls: a session, then the copyright for whatever is on screen. */
const googleUp = () =>
  vi.fn(async (url: string) =>
    url.includes('createSession')
      ? ok({ session: 'S1', expiry: String(Date.now() / 1000 + 14 * 24 * 3600) })
      : ok({ copyright: 'Map data ©2026 Google' }),
  );

const tileLayers = (map: L.Map) => {
  const found: (L.TileLayer & { _url: string })[] = [];
  map.eachLayer((layer) => {
    if (layer instanceof L.TileLayer) found.push(layer as L.TileLayer & { _url: string });
  });
  return found;
};
const urls = (map: L.Map) => tileLayers(map).map((layer) => layer._url);

// The key is read when the module loads, and "Google is down" is remembered per page load, so each test gets fresh modules.
const load = async (key: string) => {
  vi.stubEnv('VITE_GOOGLE_MAPS_KEY', key);
  vi.resetModules();
  return import('./baseLayer');
};

describe('addBaseLayer (FR-012, D-12)', () => {
  let host: HTMLDivElement;
  let map: L.Map;
  let warn: ReturnType<typeof vi.spyOn>;
  const t = i18n.getFixedT('en');

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    map = L.map(host).setView([10.79, 106.72], 13);
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    map.remove();
    host.remove();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('uses OpenStreetMap when no Google key is configured', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { addBaseLayer } = await load('');

    addBaseLayer(map, { t, language: 'en' });

    expect(urls(map)).toEqual([OSM]);
    expect(host.querySelector('.leaflet-control-attribution')?.textContent).toContain('OpenStreetMap');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('draws Google tiles with the Google Maps logo and the copyright for the area on screen', async () => {
    vi.stubGlobal('fetch', googleUp());
    const { addBaseLayer } = await load('test-key');

    addBaseLayer(map, { t, language: 'vi' });

    await vi.waitFor(() => expect(urls(map)).toEqual([GOOGLE]));
    expect(host.querySelector('img[alt="Google Maps"]')).not.toBeNull();
    await vi.waitFor(() =>
      expect(host.querySelector('.leaflet-control-attribution')?.textContent).toContain('Map data ©2026 Google'),
    );
    expect(host.querySelector('.leaflet-control-attribution')?.textContent).not.toContain('OpenStreetMap');
  });

  it('falls back to OpenStreetMap when Google refuses the session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 403, json: async () => ({}) })),
    );
    const { addBaseLayer } = await load('test-key');

    addBaseLayer(map, { t, language: 'vi' });

    await vi.waitFor(() => expect(urls(map)).toEqual([OSM]));
    expect(host.querySelector('img[alt="Google Maps"]')).toBeNull();
    // Someone setting up a key needs to learn why the map still is not Google's.
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('warns once when several maps were waiting on the refused session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 400, json: async () => ({}) })),
    );
    const { addBaseLayer } = await load('test-key');
    const secondHost = document.createElement('div');
    document.body.appendChild(secondHost);
    const second = L.map(secondHost).setView([10.79, 106.72], 13);

    addBaseLayer(map, { t, language: 'vi' });
    addBaseLayer(second, { t, language: 'vi' });

    await vi.waitFor(() => expect(urls(second)).toEqual([OSM]));
    expect(urls(map)).toEqual([OSM]);
    expect(warn).toHaveBeenCalledTimes(1);
    second.remove();
    secondHost.remove();
  });

  it('goes straight to OpenStreetMap for the next map once Google has failed', async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 403, json: async () => ({}) }));
    vi.stubGlobal('fetch', fetchMock);
    const { addBaseLayer } = await load('test-key');
    addBaseLayer(map, { t, language: 'vi' });
    await vi.waitFor(() => expect(urls(map)).toEqual([OSM]));

    const secondHost = document.createElement('div');
    document.body.appendChild(secondHost);
    const second = L.map(secondHost).setView([10.79, 106.72], 13);
    addBaseLayer(second, { t, language: 'vi' });

    expect(urls(second)).toEqual([OSM]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    second.remove();
    secondHost.remove();
  });

  /** The daily tile cap in the Google console ends in refused tiles, not a refused session. */
  it('falls back to OpenStreetMap when Google stops serving tiles', async () => {
    vi.stubGlobal('fetch', googleUp());
    const onTiles = vi.fn();
    const { addBaseLayer } = await load('test-key');
    addBaseLayer(map, { t, language: 'vi', onTiles });
    await vi.waitFor(() => expect(urls(map)).toEqual([GOOGLE]));
    await vi.waitFor(() => expect(host.querySelector('.leaflet-control-attribution')?.textContent).toContain('Google'));

    const [google] = tileLayers(map);
    for (let i = 0; i < 4; i += 1)
      google.fire('tileerror', { error: new Error('403'), tile: document.createElement('img') });

    expect(onTiles).toHaveBeenCalledWith(true);
    expect(urls(map)).toEqual([OSM]);
    expect(host.querySelector('img[alt="Google Maps"]')).toBeNull();
    expect(host.querySelector('.leaflet-control-attribution')?.textContent).not.toContain('©2026 Google');
  });

  it('switches once, however many Google tiles fail', async () => {
    vi.stubGlobal('fetch', googleUp());
    const { addBaseLayer } = await load('test-key');
    addBaseLayer(map, { t, language: 'vi' });
    await vi.waitFor(() => expect(urls(map)).toEqual([GOOGLE]));

    const [google] = tileLayers(map);
    for (let i = 0; i < 12; i += 1)
      google.fire('tileerror', { error: new Error('403'), tile: document.createElement('img') });

    expect(urls(map)).toEqual([OSM]);
  });

  it('keeps Google through a single failed tile', async () => {
    vi.stubGlobal('fetch', googleUp());
    const { addBaseLayer } = await load('test-key');
    addBaseLayer(map, { t, language: 'vi' });
    await vi.waitFor(() => expect(urls(map)).toEqual([GOOGLE]));

    const [google] = tileLayers(map);
    google.fire('tileerror', { error: new Error('404'), tile: document.createElement('img') });

    expect(urls(map)).toEqual([GOOGLE]);
  });

  it('adds nothing when the map is gone before Google answers', async () => {
    vi.stubGlobal('fetch', googleUp());
    const { addBaseLayer } = await load('test-key');

    const detach = addBaseLayer(map, { t, language: 'vi' });
    detach();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(urls(map)).toEqual([]);
    expect(host.querySelector('img[alt="Google Maps"]')).toBeNull();
  });

  it('takes everything it added off the map when detached', async () => {
    vi.stubGlobal('fetch', googleUp());
    const { addBaseLayer } = await load('test-key');
    const detach = addBaseLayer(map, { t, language: 'vi' });
    await vi.waitFor(() =>
      expect(host.querySelector('.leaflet-control-attribution')?.textContent).toContain('©2026 Google'),
    );

    detach();

    expect(urls(map)).toEqual([]);
    expect(host.querySelector('img[alt="Google Maps"]')).toBeNull();
    expect(host.querySelector('.leaflet-control-attribution')?.textContent).not.toContain('©2026 Google');
  });
});
