import type { AdminFarmerListItemType, FarmerApproval } from '@/types/farmer.types';

export type Status =
  { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; items: AdminFarmerListItemType[]; total: number };

export type FarmerTab = 'all' | FarmerApproval;

export const TABS: FarmerTab[] = ['all', 'pending', 'approved', 'suspended', 'rejected'];

export type ConfirmKind = 'approve' | 'suspend' | 'reinstate';
export type ConfirmAction = { kind: ConfirmKind; item: AdminFarmerListItemType } | null;

export const PAGE_SIZE = 10;

export const SKELETON_ROWS = 5;

export const DONE_TOAST = { approve: 'approved', suspend: 'suspended', reinstate: 'reinstated' } as const;
