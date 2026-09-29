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

export const MAX = { stallName: 120, contactPerson: 100, description: 2000 };

export const PHOTO_MAX_MB = 8;
export const VIDEO_MAX_MB = 40;
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export const ERROR_ORDER: (keyof FormErrors)[] = ['stallName', 'contactPerson', 'description', 'photos', 'terms'];

export const ERROR_ANCHOR: Record<keyof FormErrors, string> = {
  stallName: 'stall',
  contactPerson: 'person',
  description: 'about',
  photos: 'photos',
  terms: 't1',
};

export const TIMELINE = ['placed', 'accepted', 'ready'] as const;

export const SHOTS = ['wide', 'growing', 'other'] as const;
export type PhotoSlot = { key: (typeof SHOTS)[number]; url: string | null; uploading: boolean };

export type VideoSlot = { url: string | null; uploading: boolean; poster: string | null };

export const apiBase = () => import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
