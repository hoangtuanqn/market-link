import type { FarmerProfileType } from '@/types/farmer.types';

export type Status =
  { kind: 'loading' } | { kind: 'error' } | { kind: 'form' } | { kind: 'applied'; data: FarmerProfileType };

export type FormErrors = {
  stallName?: string;
  contactPerson?: string;
  description?: string;
  photos?: string;
  terms?: string;
};

/** Exactly the @Size of FarmerApplicationRequest — the client warns first, the server is still where it is decided. */
export const MAX = { stallName: 120, contactPerson: 100, description: 2000 };

/** Equal to PHOTO_MAX_BYTES / VIDEO_MAX_BYTES of FarmerUploadService. */
export const PHOTO_MAX_MB = 8;
export const VIDEO_MAX_MB = 40;
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

/** The order on screen: the first error in this order is where we scroll and focus. */
export const ERROR_ORDER: (keyof FormErrors)[] = ['stallName', 'contactPerson', 'description', 'photos', 'terms'];

/**
 * The element that receives focus for each error; the image block has no input so focus goes to its first add-image
 * button.
 */
export const ERROR_ANCHOR: Record<keyof FormErrors, string> = {
  stallName: 'stall',
  contactPerson: 'person',
  description: 'about',
  photos: 'photos',
  terms: 't1',
};

/** Keys are order statuses only for the icon and colour; the text is `timeline.<key>`. */
export const TIMELINE = ['placed', 'accepted', 'ready'] as const;

/** Three image slots; the first is required. The visible label was dropped, only the ordinal remains for screen readers. */
export const SHOTS = ['wide', 'growing', 'other'] as const;
export type PhotoSlot = { key: (typeof SHOTS)[number]; url: string | null; uploading: boolean };

export type VideoSlot = { url: string | null; uploading: boolean; poster: string | null };

export const apiBase = () => import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
