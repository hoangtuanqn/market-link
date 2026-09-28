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
 * The optional part of the application: stall introduction and evidence. The products, farming method and markets they
 * want to sell at are declared after the Admin approves, in the Farmer panel (FR-060…FR-064), so they are not here.
 * Images/videos store a local path (for test/demo only, not production infrastructure).
 */
export type FarmerApplicationDetails = {
  description?: string | null;
  photoUrls?: string[];
  videoUrl?: string | null;
};

/**
 * FR-002 (second route — a signed-in customer applies to become a Farmer; see the caption in
 * CustomerBecomeFarmer/index.tsx).
 */
export type FarmerApplicationInput = {
  stallName: string;
  contactPerson: string;
} & FarmerApplicationDetails;

/** A past application — its content at submission, the outcome and the reason if rejected. */
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

/** The caller's own Farmer profile. */
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

/** §6.1 — one row in the Admin's Farmer list. */
export type AdminFarmerListItemType = {
  id: number;
  stallName: string;
  contactPerson: string;
  email: string;
  phone: string;
  approvalStatus: FarmerApproval;
  createdAt: string;
};

/** §6.2 — full detail so the Admin can approve or suspend. */
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
  /** The Customer account already existed — this is not the creation date of this Farmer profile. */
  customerSince: string;
  accountStatus: 'active' | 'inactive' | 'suspended';
} & FarmerApplicationDetails;

/** Images/videos uploaded before submitting the main form. */
export type UploadedFileType = {
  url: string;
};
