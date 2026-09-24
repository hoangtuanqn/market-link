export type MarketType = {
  id: number;
  name: string;
  address: string;
  /** Day of week, 0 = Sunday … 6 = Saturday */
  days: number[];
  open: string;
  close: string;
  lat: number;
  lng: number;
  stalls: number;
  distance?: string;
  saved?: boolean;
};

export type AnnouncementType = {
  title: string;
  text: string;
};
