import { beforeEach, describe, expect, it, vi } from 'vitest';

const heic2any = vi.fn();
vi.mock('heic2any', () => ({ default: heic2any }));

const { ACCEPT, MAX_MEDIA_BYTES, MediaError, acceptFor, classify, prepareMedia } = await import('./media');

const file = (name: string, type: string, size = 10) => new File([new Uint8Array(size)], name, { type });

describe('classify', () => {
  it('knows every photo and video type the server takes', () => {
    for (const [name, type] of [
      ['a.jpg', 'image/jpeg'],
      ['a.png', 'image/png'],
      ['a.webp', 'image/webp'],
      ['a.gif', 'image/gif'],
      ['a.avif', 'image/avif'],
    ]) {
      expect(classify(file(name, type))).toBe('image');
    }
    for (const [name, type] of [
      ['a.mp4', 'video/mp4'],
      ['a.m4v', 'video/x-m4v'],
      ['a.mov', 'video/quicktime'],
      ['a.webm', 'video/webm'],
    ]) {
      expect(classify(file(name, type))).toBe('video');
    }
  });

  /** Some browsers (and every Windows machine) hand over a HEIC or MOV with no mime at all. */
  it('falls back to the extension when the browser gives no type', () => {
    expect(classify(file('IMG_0001.HEIC', ''))).toBe('heic');
    expect(classify(file('IMG_0001.heif', ''))).toBe('heic');
    expect(classify(file('clip.MOV', ''))).toBe('video');
    expect(classify(file('photo.JPG', ''))).toBe('image');
  });

  it('recognises HEIC by its mime too', () => {
    expect(classify(file('a', 'image/heic'))).toBe('heic');
    expect(classify(file('a', 'image/heif'))).toBe('heic');
  });

  it('refuses anything else', () => {
    expect(classify(file('setup.exe', 'application/x-msdownload'))).toBeNull();
    expect(classify(file('photos.zip', 'application/zip'))).toBeNull();
    expect(classify(file('movie.mkv', 'video/x-matroska'))).toBeNull();
    expect(classify(file('icon.svg', 'image/svg+xml'))).toBeNull();
  });

  it('offers the picker every type it can take', () => {
    for (const part of [
      'image/jpeg',
      'image/gif',
      'image/avif',
      'video/mp4',
      'video/quicktime',
      'video/webm',
      '.heic',
      '.heif',
      '.mov',
      '.m4v',
    ]) {
      expect(ACCEPT.split(',')).toContain(part);
    }
  });
});

describe('acceptFor', () => {
  const IPHONE =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148';
  const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15';

  /**
   * Final review #4: iOS converts a HEIC photo to JPEG itself unless the picker says it takes HEIC — and converting in
   * JavaScript on the phone fails for 24/48 MP photos (iOS caps a canvas at about 16.7 MP).
   */
  it('leaves HEIC out on an iPhone or iPad so iOS hands over a JPEG', () => {
    for (const device of [
      { userAgent: IPHONE, maxTouchPoints: 5 },
      // iPadOS asks for the desktop site and says "Macintosh"; only the touch screen gives it away
      { userAgent: MAC, maxTouchPoints: 5 },
    ]) {
      const accept = acceptFor(device).split(',');
      expect(accept).not.toContain('image/heic');
      expect(accept).not.toContain('.heic');
      expect(accept).toContain('image/jpeg');
      expect(accept).toContain('video/quicktime');
    }
  });

  it('keeps HEIC on a computer, where a HEIC copied from a phone is converted here', () => {
    expect(acceptFor({ userAgent: MAC, maxTouchPoints: 0 })).toBe(ACCEPT);
    expect(ACCEPT.split(',')).toContain('.heic');
  });
});

describe('prepareMedia', () => {
  // A block body: a function returned from beforeEach would be run as the test's teardown
  beforeEach(() => {
    heic2any.mockReset();
  });

  it('passes a photo or a video through untouched with its kind', async () => {
    const photo = file('a.jpg', 'image/jpeg');
    const clip = file('a.mp4', 'video/mp4');

    await expect(prepareMedia(photo)).resolves.toEqual({ file: photo, kind: 'image' });
    await expect(prepareMedia(clip)).resolves.toEqual({ file: clip, kind: 'video' });
    expect(heic2any).not.toHaveBeenCalled();
  });

  it('refuses a type the server would refuse', async () => {
    await expect(prepareMedia(file('a.zip', 'application/zip'))).rejects.toEqual(new MediaError('type'));
  });

  it('accepts exactly 50 MB and refuses one byte more', async () => {
    const limit = file('big.mp4', 'video/mp4', MAX_MEDIA_BYTES);
    await expect(prepareMedia(limit)).resolves.toMatchObject({ kind: 'video' });

    await expect(prepareMedia(file('big.mp4', 'video/mp4', MAX_MEDIA_BYTES + 1))).rejects.toEqual(
      new MediaError('size'),
    );
    expect(MAX_MEDIA_BYTES).toBe(52_428_800);
  });

  it('converts a HEIC photo to a JPEG named after it', async () => {
    heic2any.mockResolvedValue(new Blob([new Uint8Array(5)], { type: 'image/jpeg' }));

    const prepared = await prepareMedia(file('IMG_0001.HEIC', ''));

    expect(heic2any).toHaveBeenCalledWith(expect.objectContaining({ toType: 'image/jpeg' }));
    expect(prepared.kind).toBe('image');
    expect(prepared.file.name).toBe('IMG_0001.jpg');
    expect(prepared.file.type).toBe('image/jpeg');
  });

  it('tells the caller when it starts converting', async () => {
    heic2any.mockResolvedValue(new Blob([new Uint8Array(5)], { type: 'image/jpeg' }));
    const onConverting = vi.fn();

    await prepareMedia(file('a.heic', 'image/heic'), { onConverting });

    expect(onConverting).toHaveBeenCalledOnce();
  });

  it('takes the first frame when the HEIC holds several', async () => {
    heic2any.mockResolvedValue([
      new Blob([new Uint8Array(3)], { type: 'image/jpeg' }),
      new Blob([new Uint8Array(4)], { type: 'image/jpeg' }),
    ]);

    await expect(prepareMedia(file('burst.heic', 'image/heic'))).resolves.toMatchObject({ kind: 'image' });
  });

  it('reports a failed conversion as such', async () => {
    heic2any.mockRejectedValue(new Error('ERR_LIBHEIF'));

    await expect(prepareMedia(file('a.heic', 'image/heic'))).rejects.toEqual(new MediaError('convert'));
  });

  it('checks the size again after converting', async () => {
    heic2any.mockResolvedValue(new Blob([new Uint8Array(MAX_MEDIA_BYTES + 1)], { type: 'image/jpeg' }));

    await expect(prepareMedia(file('a.heic', 'image/heic'))).rejects.toEqual(new MediaError('size'));
  });
});
