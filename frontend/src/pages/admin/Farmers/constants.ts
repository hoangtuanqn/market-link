import type { AdminFarmerListItemType, FarmerApproval } from '@/types/farmer.types';

export type Status =
  { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; items: AdminFarmerListItemType[]; total: number };

/** Docs/prototype/admin/farmers.html — tabs by approval status, each tab has its own empty content (`empty.<tab>`). */
export const TABS: FarmerApproval[] = ['pending', 'approved', 'suspended', 'rejected'];

export type ConfirmKind = 'approve' | 'suspend' | 'reinstate';
export type ConfirmAction = { kind: ConfirmKind; item: AdminFarmerListItemType } | null;

/** Enough to see a whole screen without a long scroll; the rest goes to the next page. */
export const PAGE_SIZE = 10;

/** The number of fake rows while waiting — equal to a full page so the frame does not jump when data arrives. */
export const SKELETON_ROWS = 5;

/** Toast after an action finishes: `toast.<key>`. */
export const DONE_TOAST = { approve: 'approved', suspend: 'suspended', reinstate: 'reinstated' } as const;
