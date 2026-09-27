import type { TFunction } from 'i18next';
import {
  ERROR_ANCHOR,
  ERROR_ORDER,
  MAX,
  PHOTO_MAX_MB,
  PHOTO_TYPES,
  VIDEO_MAX_MB,
  VIDEO_TYPES,
  type FormErrors,
  type PhotoSlot,
  type VideoSlot,
} from './constants';

type T = TFunction<'CustomerBecomeFarmer'>;

/**
 * Block on the spot what the server would block, so the user does not have to finish uploading 40MB before learning it
 * is wrong.
 */
export const fileError = (file: File, kind: 'photo' | 'video', t: T) => {
  const isPhoto = kind === 'photo';
  const types = isPhoto ? PHOTO_TYPES : VIDEO_TYPES;
  const maxMb = isPhoto ? PHOTO_MAX_MB : VIDEO_MAX_MB;
  if (!types.includes(file.type)) return t(isPhoto ? 'errors.photoType' : 'errors.videoType');
  if (file.size > maxMb * 1024 * 1024) {
    return t(isPhoto ? 'errors.photoTooLarge' : 'errors.videoTooLarge', { max: maxMb });
  }
  return null;
};

export type ApplicationValues = {
  stallName: string;
  contactPerson: string;
  description: string;
  photos: PhotoSlot[];
  video: VideoSlot;
  ticks: [boolean, boolean, boolean];
};

export const validate = (
  { stallName, contactPerson, description, photos, video, ticks }: ApplicationValues,
  t: T,
): FormErrors => {
  const next: FormErrors = {};
  const stall = stallName.trim();
  const person = contactPerson.trim();
  const about = description.trim();

  if (!stall) next.stallName = t('errors.stallName');
  else if (stall.length > MAX.stallName) next.stallName = t('errors.stallNameLong', { max: MAX.stallName });

  if (!person) next.contactPerson = t('errors.contactPerson');
  else if (person.length > MAX.contactPerson) {
    next.contactPerson = t('errors.contactPersonLong', { max: MAX.contactPerson });
  }

  if (about.length > MAX.description) next.description = t('errors.descriptionLong', { max: MAX.description });

  // Submitting before the images finish uploading would send the application without images and nobody would know — block it outright.
  if (photos.some((p) => p.uploading) || video.uploading) next.photos = t('errors.uploadInProgress');
  else if (!photos.some((p) => p.url)) next.photos = t('errors.photoRequired');

  if (!ticks.every(Boolean)) next.terms = t('errors.terms');

  return next;
};

/**
 * The error is at the top of the form while the Submit button is at the bottom: without scrolling to it the user thinks
 * the click did nothing.
 */
export const focusFirstError = (found: FormErrors) => {
  const key = ERROR_ORDER.find((k) => found[k]);
  if (!key) return;
  const node = document.getElementById(ERROR_ANCHOR[key]);
  if (!node) return;
  node.scrollIntoView({ behavior: 'smooth', block: 'center' });
  // The image block is a <div>, it cannot take focus by itself: take the first add-image button inside.
  const target = node.matches('input, textarea, button') ? node : node.querySelector<HTMLElement>('button, input');
  target?.focus({ preventScroll: true });
};
