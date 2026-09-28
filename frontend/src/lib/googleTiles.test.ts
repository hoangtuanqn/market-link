import L from 'leaflet';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const DAY_S = 24 * 60 * 60;

/** A fetch that answers every createSession with a fresh token valid for `validForS` seconds. */
function sessionFetch(validForS = 14 * DAY_S) {
  let n = 0;
  return vi.fn(async () => {
    n += 1;
    return {
      ok: true,
      status: 200,
      json: async () => ({ session: `S${n}`, expiry: String(Date.now() / 1000 + validForS) }),
    };
  });
}

const bodyOf = (fetchMock: ReturnType<typeof vi.fn>, call = 0) =>
  JSON.parse((fetchMock.mock.calls[call] as [string, RequestInit])[1].body as string);

// The session cache is module state, so every test gets a fresh copy of the module.
const load = async () => {
  vi.resetModules();
  return import('./googleTiles');
};

describe('googleSession (FR-012, D-12)', () => {
  beforeEach(() => {
    vi.stubGlobal('devicePixelRatio', 1);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('asks Google for a roadmap session in the reader’s language, for Vietnam', async () => {
    const fetchMock = sessionFetch();
    vi.stubGlobal('fetch', fetchMock);
    const { googleSession } = await load();

    await expect(googleSession('test-key', 'vi')).resolves.toBe('S1');

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://tile.googleapis.com/v1/createSession?key=test-key');
    expect(init.method).toBe('POST');
    expect(bodyOf(fetchMock)).toEqual({ mapType: 'roadmap', language: 'vi', region: 'VN' });
  });

  it('asks for sharp tiles on a high-density screen', async () => {
    vi.stubGlobal('devicePixelRatio', 2);
    const fetchMock = sessionFetch();
    vi.stubGlobal('fetch', fetchMock);
    const { googleSession } = await load();

    await googleSession('test-key', 'en');

    expect(bodyOf(fetchMock)).toMatchObject({ scale: 'scaleFactor2x', highDpi: true });
  });

  it('names Chinese as Simplified Chinese, the script the app is written in', async () => {
    const fetchMock = sessionFetch();
    vi.stubGlobal('fetch', fetchMock);
    const { googleSession } = await load();

    await googleSession('test-key', 'zh');

    expect(bodyOf(fetchMock).language).toBe('zh-CN');
  });

  it('reuses one session per language instead of asking again for every map', async () => {
    const fetchMock = sessionFetch();
    vi.stubGlobal('fetch', fetchMock);
    const { googleSession } = await load();

    await googleSession('test-key', 'vi');
    await googleSession('test-key', 'vi');
    await googleSession('test-key', 'en');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('asks for a new session when the old one is about to expire', async () => {
    // Valid for 30 more minutes: inside the hour of slack, so it counts as used up.
    const fetchMock = sessionFetch(30 * 60);
    vi.stubGlobal('fetch', fetchMock);
    const { googleSession } = await load();

    await googleSession('test-key', 'vi');
    await expect(googleSession('test-key', 'vi')).resolves.toBe('S2');
  });

  it('does not keep a refused request, so a later map can try again', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ session: 'S2', expiry: String(Date.now() / 1000 + DAY_S) }),
      });
    vi.stubGlobal('fetch', fetchMock);
    const { googleSession } = await load();

    await expect(googleSession('test-key', 'vi')).rejects.toThrow('403');
    await expect(googleSession('test-key', 'vi')).resolves.toBe('S2');
  });
});

describe('googleTileUrl', () => {
  it('is a Leaflet template carrying the session and the key', async () => {
    const { googleTileUrl } = await load();

    expect(googleTileUrl('S1', 'test-key')).toBe(
      'https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=S1&key=test-key',
    );
  });
});

describe('googleCopyright', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the credit Google gives for the area on screen', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ copyright: 'Map data ©2026 Google' }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { googleCopyright } = await load();

    const bounds = L.latLngBounds([10.7, 106.6], [10.9, 106.8]);
    await expect(googleCopyright('S1', 'test-key', 13, bounds)).resolves.toBe('Map data ©2026 Google');

    const url = new URL((fetchMock.mock.calls[0] as unknown as [string])[0]);
    expect(`${url.origin}${url.pathname}`).toBe('https://tile.googleapis.com/tile/v1/viewport');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      session: 'S1',
      key: 'test-key',
      zoom: '13',
      north: '10.9',
      south: '10.7',
      east: '106.8',
      west: '106.6',
    });
  });

  /** Zoomed right out, Leaflet's view runs past the poles and around the world; Google rejects those numbers. */
  it('keeps the bounds inside the ranges Google accepts', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ copyright: 'Google' }) }));
    vi.stubGlobal('fetch', fetchMock);
    const { googleCopyright } = await load();

    await googleCopyright('S1', 'test-key', 1, L.latLngBounds([-95, -250], [95, 250]));

    const q = new URL((fetchMock.mock.calls[0] as unknown as [string])[0]).searchParams;
    for (const side of ['north', 'south']) expect(Math.abs(Number(q.get(side)))).toBeLessThan(90);
    for (const side of ['east', 'west']) expect(Math.abs(Number(q.get(side)))).toBeLessThan(180);
  });
});
