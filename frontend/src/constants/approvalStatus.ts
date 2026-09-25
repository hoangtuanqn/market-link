import { CheckIcon, CircleSlashIcon, ClockIcon, CloseIcon } from '@/components/icons';
import type { FarmerApproval } from '@/types/farmer.types';

/** §3 — màu/nhãn trạng thái duyệt Farmer, dùng chung cho danh sách và chi tiết Admin. */
export const APPROVAL_STATUS_META: Record<
  FarmerApproval,
  { label: string; icon: typeof ClockIcon; className: string }
> = {
  pending: { label: 'Pending', icon: ClockIcon, className: 'bg-status-placed-bg text-status-placed-ink' },
  approved: { label: 'Approved', icon: CheckIcon, className: 'bg-status-completed-bg text-status-completed-ink' },
  rejected: { label: 'Rejected', icon: CloseIcon, className: 'bg-status-cancelled-bg text-status-cancelled-ink' },
  suspended: {
    label: 'Suspended',
    icon: CircleSlashIcon,
    className: 'bg-status-declined-bg text-status-declined-ink',
  },
};
