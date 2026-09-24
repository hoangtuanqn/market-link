import { CheckIcon, CircleSlashIcon, ClockIcon, CloseIcon, DoubleCheckIcon, ReceiptIcon } from '@/components/icons';
import type { OrderStatus } from '@/types/order.types';

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; icon: typeof ClockIcon; className: string }> = {
  placed: { label: 'Placed', icon: ClockIcon, className: 'bg-status-placed-bg text-status-placed-ink' },
  accepted: { label: 'Accepted', icon: CheckIcon, className: 'bg-status-accepted-bg text-status-accepted-ink' },
  ready: { label: 'Ready for pickup', icon: ReceiptIcon, className: 'bg-status-ready-bg text-status-ready-ink' },
  completed: {
    label: 'Completed',
    icon: DoubleCheckIcon,
    className: 'bg-status-completed-bg text-status-completed-ink',
  },
  declined: { label: 'Declined', icon: CloseIcon, className: 'bg-status-declined-bg text-status-declined-ink' },
  cancelled: {
    label: 'Cancelled',
    icon: CircleSlashIcon,
    className: 'bg-status-cancelled-bg text-status-cancelled-ink',
  },
};
