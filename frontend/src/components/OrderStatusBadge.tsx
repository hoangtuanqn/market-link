import { CheckIcon, CircleSlashIcon, ClockIcon, CloseIcon, DoubleCheckIcon, ReceiptIcon } from '@/components/icons';
import type { OrderStatus } from '@/types/order.types';
import Helper from '@/utils/helper';

const META: Record<OrderStatus, { label: string; icon: typeof ClockIcon; className: string }> = {
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

/** Pill with a glyph and a word, so order state never rests on colour alone (design system `.ml-status`). */
const OrderStatusBadge = ({ status }: { status: OrderStatus }) => {
  const { label, icon: Icon, className } = META[status];
  return (
    <span
      className={Helper.cn(
        'inline-flex items-center gap-1 rounded-full py-0.75 pr-2.5 pl-2 text-[13px] leading-4.5 font-bold',
        className,
      )}
    >
      <Icon size={14} />
      <span className={status === 'cancelled' ? 'line-through' : undefined}>{label}</span>
    </span>
  );
};

export default OrderStatusBadge;
