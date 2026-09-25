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
