/** Giới hạn ảnh gốc trước khi cắt; ảnh gửi lên sau khi cắt chỉ vài chục KB. */
export const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

/** Why a photo cannot be used; the dialog shows `CustomerAccount:photoErrors.<code>`. */
export type PhotoErrorCode = 'notPhoto' | 'tooBig' | 'unreadable' | 'noPicture' | 'captureFailed';

export class PhotoError extends Error {
  readonly code: PhotoErrorCode;

  constructor(code: PhotoErrorCode) {
    super(code);
    this.code = code;
  }
}

/** Giải mã ảnh bằng chính trình duyệt, nên HEIC / WebP cũng dùng được nếu trình duyệt đọc được. */
export const loadImage = async (blob: Blob): Promise<HTMLImageElement> => {
  if (blob.type && !blob.type.startsWith('image/')) {
    throw new PhotoError('notPhoto');
  }
  if (blob.size > MAX_SOURCE_BYTES) {
    throw new PhotoError('tooBig');
  }
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch {
    URL.revokeObjectURL(url);
    throw new PhotoError('unreadable');
  }
  return img;
};

export const releaseImage = (img: HTMLImageElement | null) => {
  if (img?.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
};

/** Khung hình hiện tại của camera, lật như gương để giống đúng thứ người dùng vừa thấy. */
export const captureFrame = (video: HTMLVideoElement): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx || !canvas.width) return Promise.reject(new PhotoError('noPicture'));
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new PhotoError('captureFailed'))), 'image/jpeg', 0.92),
  );
};
