import LocalStorage from '@/utils/localstorage';

/**
 * Bản nháp đơn xin thành Farmer, lưu ngay trên máy khi người dùng bấm "Lưu, để sau làm tiếp". Ảnh và video đã nằm trên
 * server từ lúc tải lên nên nháp chỉ giữ đường dẫn — mở lại là thấy đủ ảnh. Nháp gắn với từng tài khoản để hai người
 * dùng chung một máy không thấy nháp của nhau, và nằm trong trình duyệt chứ không phải server: đổi máy hoặc xoá dữ liệu
 * duyệt web là mất.
 */
export type FarmerDraft = {
  stallName: string;
  contactPerson: string;
  description: string;
  photoUrls: string[];
  videoUrl: string | null;
  /** ISO — dùng để nói "đã lưu ngày …" khi mở lại. */
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
    // Nháp hỏng (người dùng sửa tay, đổi phiên bản) thì coi như không có, đừng làm vỡ trang.
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

/** Nháp trống (chưa gõ gì) thì không tính là có việc dở dang. */
export function isEmptyDraft(draft: FarmerDraft) {
  return (
    !draft.stallName.trim() &&
    !draft.contactPerson.trim() &&
    !draft.description.trim() &&
    draft.photoUrls.length === 0 &&
    !draft.videoUrl
  );
}
