export type FarmerApproval = 'approved' | 'pending' | 'rejected' | 'suspended';

export type FarmerType = {
  id: number;
  stall: string;
  person: string;
  phone: string;
  email: string;
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

export type FarmerApplicationDetails = {
  description?: string | null;
  photoUrls?: string[];
  videoUrl?: string | null;
};

export type FarmerApplicationInput = {
  stallName: string;
  contactPerson: string;
} & FarmerApplicationDetails;

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

export type AdminFarmerListItemType = {
  id: number;
  stallName: string;
  contactPerson: string;
  email: string;
  phone: string;
  approvalStatus: FarmerApproval;
  createdAt: string;
  avatarUrl?: string | null;
};

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
  customerSince: string;
  accountStatus: 'active' | 'inactive' | 'suspended';
  activeViolations: number;
  extensionLockedUntil: string | null;
} & FarmerApplicationDetails;

export type UploadedFileType = {
  url: string;
};
