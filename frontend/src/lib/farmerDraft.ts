import LocalStorage from '@/utils/localstorage';

export type FarmerDraft = {
  stallName: string;
  contactPerson: string;
  description: string;
  photoUrls: string[];
  videoUrl: string | null;
  savedAt: string;
};

const key = (userId: number) => `marketlink.farmer-draft.${userId}`;

export function readDraft(userId: number | undefined): FarmerDraft | null {
  if (userId == null) return null;
  const raw = LocalStorage.getItem(key(userId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<FarmerDraft>;
    if (!parsed || typeof parsed.stallName !== 'string') return null;
    return {
      stallName: parsed.stallName,
      contactPerson: parsed.contactPerson ?? '',
      description: parsed.description ?? '',
      photoUrls: Array.isArray(parsed.photoUrls) ? parsed.photoUrls : [],
      videoUrl: parsed.videoUrl ?? null,
      savedAt: parsed.savedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveDraft(userId: number | undefined, draft: Omit<FarmerDraft, 'savedAt'>) {
  if (userId == null) return;
  LocalStorage.setItem(key(userId), JSON.stringify({ ...draft, savedAt: new Date().toISOString() }));
}

export function clearDraft(userId: number | undefined) {
  if (userId == null) return;
  LocalStorage.removeItem(key(userId));
}

export function isEmptyDraft(draft: FarmerDraft) {
  return (
    !draft.stallName.trim() &&
    !draft.contactPerson.trim() &&
    !draft.description.trim() &&
    draft.photoUrls.length === 0 &&
    !draft.videoUrl
  );
}
