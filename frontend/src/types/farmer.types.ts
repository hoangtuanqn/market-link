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
 * Phần optional của đơn: giới thiệu sạp và bằng chứng. Mặt hàng, cách canh tác và chợ muốn bán được khai sau khi Admin
 * duyệt, ở panel Farmer (FR-060…FR-064), nên không có ở đây. Ảnh/video lưu path cục bộ (chỉ phục vụ test/demo, không
 * phải hạ tầng production).
 */
export type FarmerApplicationDetails = {
  description?: string | null;
  photoUrls?: string[];
  videoUrl?: string | null;
};

/** FR-002 (second route — customer đang đăng nhập xin thành Farmer; xem caption CustomerBecomeFarmer/index.tsx). */
export type FarmerApplicationInput = {
  stallName: string;
  contactPerson: string;
} & FarmerApplicationDetails;

/** Một lần nộp đơn đã qua — nội dung lúc nộp, kết quả và lý do nếu bị từ chối. */
export type FarmerApplicationAttemptType = {
  id: number;
  attempt: number;
  stallName: string;
  contactPerson: string;
  description?: string | null;
  photoUrls?: string[];
  videoUrl?: string | null;
  status: FarmerApproval;
  rejectReason: string | null;
  decidedAt: string | null;
  submittedAt: string;
};

/** Hồ sơ Farmer của chính người gọi. */
export type FarmerProfileType = {
  id: number;
  stallName: string;
  contactPerson: string;
  approvalStatus: FarmerApproval;
  rejectReason: string | null;
  suspendReason: string | null;
  history: FarmerApplicationAttemptType[];
  createdAt: string;
} & FarmerApplicationDetails;

/** §6.1 — một dòng trong danh sách Farmer của Admin. */
export type AdminFarmerListItemType = {
  id: number;
  stallName: string;
  contactPerson: string;
  email: string;
  phone: string;
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
  suspendReason: string | null;
  approvedAt: string | null;
  suspendedAt: string | null;
  createdAt: string;
  history: FarmerApplicationAttemptType[];
  /** Tài khoản Customer đã có từ trước — không phải ngày tạo hồ sơ Farmer này. */
  customerSince: string;
  accountStatus: 'active' | 'inactive' | 'suspended';
} & FarmerApplicationDetails;

/** Ảnh/video tải lên trước khi gửi form chính. */
export type UploadedFileType = {
  url: string;
};
