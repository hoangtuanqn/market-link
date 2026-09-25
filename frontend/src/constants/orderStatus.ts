import { CheckIcon, CircleSlashIcon, ClockIcon, CloseIcon, DoubleCheckIcon, ReceiptIcon } from '@/components/icons';
import i18n from '@/i18n';
import type { OrderStatus } from '@/types/order.types';

type StatusMeta = {
  /** The status word in the interface language, looked up each time it is read (key `orderStatus.<status>`). */
  readonly label: string;
  icon: typeof ClockIcon;
  className: string;
};

const meta = (status: OrderStatus, icon: typeof ClockIcon, className: string): StatusMeta => ({
  get label() {
    return i18n.t(`orderStatus.${status}`);
  },
  icon,
  className,
});

export const ORDER_STATUS_META: Record<OrderStatus, StatusMeta> = {
  placed: meta('placed', ClockIcon, 'bg-status-placed-bg text-status-placed-ink'),
  accepted: meta('accepted', CheckIcon, 'bg-status-accepted-bg text-status-accepted-ink'),
  ready: meta('ready', ReceiptIcon, 'bg-status-ready-bg text-status-ready-ink'),
  completed: meta('completed', DoubleCheckIcon, 'bg-status-completed-bg text-status-completed-ink'),
  declined: meta('declined', CloseIcon, 'bg-status-declined-bg text-status-declined-ink'),
  cancelled: meta('cancelled', CircleSlashIcon, 'bg-status-cancelled-bg text-status-cancelled-ink'),
};
