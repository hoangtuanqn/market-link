/**
 * FR-115 (spec 2026-09-28-chat-media-design §6): what the chat can send, checked in the browser before any upload. The
 * server checks again from the file's bytes; this only saves the person a 50 MB upload that would be refused.
 */

/** Matches app.chat.max-upload-bytes on the server. */
export const MAX_MEDIA_BYTES = 52_428_800;

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const VIDEO_TYPES = ['video/mp4', 'video/x-m4v', 'video/quicktime', 'video/webm'];
const HEIC_TYPES = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'];

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];
const VIDEO_EXTENSIONS = ['mp4', 'm4v', 'mov', 'webm'];
const HEIC_EXTENSIONS = ['heic', 'heif'];

/** The file picker's `accept`: the mime types plus the extensions some systems report no mime for. */
export const ACCEPT = [...IMAGE_TYPES, ...VIDEO_TYPES, ...HEIC_TYPES, '.heic', '.heif', '.mov', '.m4v'].join(',');

export type MediaKind = 'image' | 'video';

export class MediaError extends Error {
  constructor(readonly reason: 'type' | 'size' | 'convert') {
    super(reason);
    this.name = 'MediaError';
  }
}

/** By mime first; by extension when the browser gives none (HEIC on Windows, MOV on some Androids). */
export function classify(file: File): MediaKind | 'heic' | null {
  const type = file.type.toLowerCase();
  if (IMAGE_TYPES.includes(type)) return 'image';
  if (VIDEO_TYPES.includes(type)) return 'video';
  if (HEIC_TYPES.includes(type)) return 'heic';
  if (type) return null;
  const extension = file.name.toLowerCase().split('.').pop() ?? '';
  if (IMAGE_EXTENSIONS.includes(extension)) return 'image';
  if (VIDEO_EXTENSIONS.includes(extension)) return 'video';
  if (HEIC_EXTENSIONS.includes(extension)) return 'heic';
  return null;
}

/**
 * Makes a picked file ready to upload. A HEIC photo (the iPhone default) is converted to JPEG here, because browsers
 * other than Safari cannot show HEIC; the converter is only loaded when needed.
 */
export async function prepareMedia(
  file: File,
  { onConverting }: { onConverting?: () => void } = {},
): Promise<{ file: File; kind: MediaKind }> {
  const kind = classify(file);
  if (kind === null) throw new MediaError('type');
  if (kind !== 'heic') {
    if (file.size > MAX_MEDIA_BYTES) throw new MediaError('size');
    return { file, kind };
  }
  onConverting?.();
  let jpeg: File;
  try {
    const { default: heic2any } = await import('heic2any');
    const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
    const blob = Array.isArray(result) ? result[0] : result;
    const name = file.name.replace(/\.[^.]+$/, '') || 'photo';
    jpeg = new File([blob], `${name}.jpg`, { type: 'image/jpeg' });
  } catch {
    throw new MediaError('convert');
  }
  if (jpeg.size > MAX_MEDIA_BYTES) throw new MediaError('size');
  return { file: jpeg, kind: 'image' };
}
