import type { AddressParts } from './address.types';

export type MarketType = {
  id: number;
  name: string;
  address: string;
  area: string;
  addressParts?: AddressParts;
  days: number[];
  open: string;
  close: string;
  lat: number;
  lng: number;
  stalls: number;
  distance?: string;
  images?: string[];
};

export type AnnouncementType = {
  title: string;
  text: string;
};

export type ClosureHandling = 'move' | 'contact' | 'cancel';

export type ClosureType = {
  id: number;
  marketId: number;
  date: string;
  weekday: string;
  reason: string;
  handling: ClosureHandling;
  orders: number;
  announced: boolean;
  by: string;
};

export const CLOSURE_HANDLINGS: ClosureHandling[] = ['move', 'contact', 'cancel'];
