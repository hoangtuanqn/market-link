/**
 * The maths of the image crop frame: the image always fully covers the square frame, dragging and zooming never reveal
 * the background.
 */

export type Offset = { x: number; y: number };

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
/** The side of the image sent to the server (the backend also scales down to at most 512px). */
export const OUTPUT_SIZE = 512;

/** Screen px per image px, when the image just covers the frame (zoom 1). */
export const coverScale = (imgW: number, imgH: number, frame: number) => frame / Math.min(imgW, imgH);

/**
 * Keep the image covering the frame: the maximum offset per axis is half of the part of the image sticking out of the
 * frame.
 */
export const clampOffset = (offset: Offset, imgW: number, imgH: number, frame: number, zoom: number): Offset => {
  const scale = coverScale(imgW, imgH, frame) * zoom;
  const maxX = Math.max(0, (imgW * scale - frame) / 2);
  const maxY = Math.max(0, (imgH * scale - frame) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, offset.x)),
    y: Math.min(maxY, Math.max(-maxY, offset.y)),
  };
};

/** The region of the source image (image px) currently inside the frame. */
export const sourceRect = (imgW: number, imgH: number, frame: number, zoom: number, offset: Offset) => {
  const scale = coverScale(imgW, imgH, frame) * zoom;
  const side = frame / scale;
  return {
    sx: imgW / 2 - (frame / 2 + offset.x) / scale,
    sy: imgH / 2 - (frame / 2 + offset.y) / scale,
    side,
  };
};

/** Crop the region inside the frame into a square JPEG OUTPUT_SIZE (or smaller if the source image is smaller). */
export const cropToJpeg = (
  image: CanvasImageSource & { naturalWidth?: number; videoWidth?: number },
  imgW: number,
  imgH: number,
  frame: number,
  zoom: number,
  offset: Offset,
): Promise<Blob> => {
  const { sx, sy, side } = sourceRect(imgW, imgH, frame, zoom, offset);
  const size = Math.max(1, Math.round(Math.min(OUTPUT_SIZE, side)));
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Canvas is not available.'));
  // JPEG has no transparent background: a transparent PNG becomes a white background, like the backend
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, sx, sy, side, side, 0, 0, size, size);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not create the photo.'))),
      'image/jpeg',
      0.9,
    ),
  );
};
