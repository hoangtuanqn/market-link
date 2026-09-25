/** Toán của khung cắt ảnh: ảnh luôn phủ kín khung vuông, kéo và zoom không bao giờ để lộ nền. */

export type Offset = { x: number; y: number };

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
/** Cạnh ảnh gửi lên server (backend cũng thu về tối đa 512px). */
export const OUTPUT_SIZE = 512;

/** Số px trên màn hình cho mỗi px của ảnh, khi ảnh vừa phủ kín khung (zoom 1). */
export const coverScale = (imgW: number, imgH: number, frame: number) => frame / Math.min(imgW, imgH);

/** Giữ ảnh phủ kín khung: độ lệch tối đa theo mỗi trục là nửa phần ảnh thừa ra ngoài khung. */
export const clampOffset = (offset: Offset, imgW: number, imgH: number, frame: number, zoom: number): Offset => {
  const scale = coverScale(imgW, imgH, frame) * zoom;
  const maxX = Math.max(0, (imgW * scale - frame) / 2);
  const maxY = Math.max(0, (imgH * scale - frame) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, offset.x)),
    y: Math.min(maxY, Math.max(-maxY, offset.y)),
  };
};

/** Vùng ảnh gốc (px ảnh) đang nằm trong khung. */
export const sourceRect = (imgW: number, imgH: number, frame: number, zoom: number, offset: Offset) => {
  const scale = coverScale(imgW, imgH, frame) * zoom;
  const side = frame / scale;
  return {
    sx: imgW / 2 - (frame / 2 + offset.x) / scale,
    sy: imgH / 2 - (frame / 2 + offset.y) / scale,
    side,
  };
};

/** Cắt vùng trong khung thành JPEG vuông OUTPUT_SIZE (hoặc nhỏ hơn nếu ảnh gốc nhỏ hơn). */
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
  // JPEG không có nền trong suốt: PNG trong suốt thành nền trắng, giống backend
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
