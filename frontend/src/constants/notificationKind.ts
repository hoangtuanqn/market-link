import { MegaphoneIcon, ReceiptIcon, RestockIcon, StoreIcon } from '@/components/icons';
import { ORDER_STATUS_META } from '@/constants/orderStatus';

export type NotificationKind =
  'accepted' | 'declined' | 'ready' | 'restock' | 'announce' | 'invite' | 'placed' | 'cancelled';

export const NOTIFICATION_META: Record<NotificationKind, { icon: typeof ReceiptIcon; className: string }> = {
  accepted: ORDER_STATUS_META.accepted,
  declined: ORDER_STATUS_META.declined,
  ready: ORDER_STATUS_META.ready,
  placed: ORDER_STATUS_META.placed,
  cancelled: ORDER_STATUS_META.cancelled,
  restock: { icon: RestockIcon, className: 'bg-brand-tint text-ink' },
  invite: { icon: StoreIcon, className: 'bg-brand-tint text-ink' },
  announce: { icon: MegaphoneIcon, className: 'bg-highlight text-ink' },
};
