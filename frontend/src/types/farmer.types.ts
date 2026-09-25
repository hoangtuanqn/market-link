export type FarmerApproval = 'approved' | 'pending' | 'rejected' | 'suspended';

export type FarmerType = {
  id: number;
  stall: string;
  person: string;
  phone: string;
  email: string;
  /** Market ids this stall sells at. */
  markets: number[];
  days: string;
  pickup: string;
  rating: number | null;
  reviews: number;
  distance?: string;
  approval: FarmerApproval;
  cutoffHours: number;
  lat: number | null;
  lng: number | null;
  stallCode: string;
  registered: string;
  about: string;
  suspendedReason?: string;
};

/**
 * Các trường theo docs/prototype/customer/become-farmer.html, tất cả optional. Chưa có bảng categories/markets thật nên
 * `categories`/`preferredMarketName` là text tự do, không phải id. Ảnh/video lưu path cục bộ (chỉ phục vụ test/demo,
 * không phải hạ tầng production).
 */
export type FarmerApplicationDetails = {
  description?: string | null;
  categories?: string[];
  mainCrops?: string | null;
  weeklyVolume?: string | null;
  growingMethod?: string | null;
  plotAddress?: string | null;
  plotSize?: string | null;
  growingSinceYear?: number | null;
  plotLatitude?: number | null;
  plotLongitude?: number | null;
  photoUrls?: string[];
  videoUrl?: string | null;
  preferredMarketName?: string | null;
};

/** FR-002 (second route — customer đang đăng nhập xin thành Farmer; xem caption CustomerBecomeFarmer/index.tsx). */
export type FarmerApplicationInput = {
  stallName: string;
  contactPerson: string;
} & FarmerApplicationDetails;

/** Hồ sơ Farmer của chính người gọi. */
export type FarmerProfileType = {
  id: number;
  stallName: string;
  contactPerson: string;
  approvalStatus: FarmerApproval;
  createdAt: string;
} & FarmerApplicationDetails;

/** §6.1 — một dòng trong danh sách Farmer của Admin. */
export type AdminFarmerListItemType = {
  id: number;
  stallName: string;
  contactPerson: string;
  email: string;
  approvalStatus: FarmerApproval;
  createdAt: string;
};

/** §6.2 — chi tiết đầy đủ để Admin duyệt hoặc đình chỉ. */
export type AdminFarmerDetailType = {
  id: number;
  userId: number;
  stallName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  approvalStatus: FarmerApproval;
  rejectReason: string | null;
  approvedAt: string | null;
  createdAt: string;
  /** Tài khoản Customer đã có từ trước — không phải ngày tạo hồ sơ Farmer này. */
  customerSince: string;
  accountStatus: 'active' | 'inactive' | 'suspended';
} & FarmerApplicationDetails;

/** Ảnh/video tải lên trước khi gửi form chính. */
export type UploadedFileType = {
  url: string;
};
