const API_ORIGIN = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

/**
 * A self-uploaded image is returned by the backend as "/uploads/…" (same origin as the API); a Google image is already
 * a full URL.
 */
export const avatarSrc = (url?: string | null) => {
  if (!url) return undefined;
  return url.startsWith('/') ? `${API_ORIGIN}${url}` : url;
};

/** "Nguyễn Văn An" → "NA"; one word → one letter; with no name, use the first letter of the email. */
export const initials = (name?: string | null, email?: string | null) => {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return (email ?? '?').charAt(0).toUpperCase();
  const first = words[0].charAt(0);
  const last = words.length > 1 ? words[words.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
};
