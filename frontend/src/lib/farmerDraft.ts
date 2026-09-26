import LocalStorage from '@/utils/localstorage';

/**
 * A draft of the Farmer application, saved right on the machine when the user clicks "Save and finish later". The
 * images and videos are already on the server from the moment they were uploaded so the draft only keeps the paths —
 * reopening shows every image. The draft is tied to each account so two people sharing one machine do not see each
 * other's drafts, and it lives in the browser, not the server: switching machines or clearing browsing data loses it.
 */
export type FarmerDraft = {
  stallName: string;
  contactPerson: string;
  description: string;
  photoUrls: string[];
  videoUrl: string | null;
  /** ISO — used to say "saved on …" when reopened. */
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
    // A corrupt draft (edited by hand, version change) counts as none, do not break the page.
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

/** An empty draft (nothing typed) does not count as unfinished work. */
export function isEmptyDraft(draft: FarmerDraft) {
  return (
    !draft.stallName.trim() &&
    !draft.contactPerson.trim() &&
    !draft.description.trim() &&
    draft.photoUrls.length === 0 &&
    !draft.videoUrl
  );
}
