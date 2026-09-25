const API_ORIGIN = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

/** Ảnh tự tải lên được backend trả dạng "/uploads/…" (cùng origin với API); ảnh Google đã là URL đầy đủ. */
export const avatarSrc = (url?: string | null) => {
  if (!url) return undefined;
  return url.startsWith('/') ? `${API_ORIGIN}${url}` : url;
};

/** "Nguyễn Văn An" → "NA"; một từ → một chữ; không có tên thì lấy chữ đầu email. */
export const initials = (name?: string | null, email?: string | null) => {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return (email ?? '?').charAt(0).toUpperCase();
  const first = words[0].charAt(0);
  const last = words.length > 1 ? words[words.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
};
