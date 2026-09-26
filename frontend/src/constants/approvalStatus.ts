import { CheckIcon, CircleSlashIcon, ClockIcon, CloseIcon } from '@/components/icons';
import type { FarmerApproval } from '@/types/farmer.types';

/**
 * §3 — colour/icon of the Farmer approval status, shared by the Admin list and detail. Label:
 * `AdminFarmers:status.<key>`.
 */
export const APPROVAL_STATUS_META: Record<FarmerApproval, { icon: typeof ClockIcon; className: string }> = {
  pending: { icon: ClockIcon, className: 'bg-status-placed-bg text-status-placed-ink' },
  approved: { icon: CheckIcon, className: 'bg-status-completed-bg text-status-completed-ink' },
  rejected: { icon: CloseIcon, className: 'bg-status-cancelled-bg text-status-cancelled-ink' },
  suspended: { icon: CircleSlashIcon, className: 'bg-status-declined-bg text-status-declined-ink' },
};

/**
 * Exactly the @Size of RejectFarmerRequest / SuspendFarmerRequest — the client warns first, the server has the final
 * say.
 */
export const REASON_MAX = 255;
