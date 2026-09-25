import { useTranslation } from 'react-i18next';
import { ORDER_STATUS_META } from '@/constants/orderStatus';
import type { OrderStatus } from '@/types/order.types';
import Helper from '@/utils/helper';

/** Pill with a glyph and a word, so order state never rests on colour alone (design system `.ml-status`). */
const OrderStatusBadge = ({ status }: { status: OrderStatus }) => {
  const { t } = useTranslation();
  const { icon: Icon, className } = ORDER_STATUS_META[status];
  const label = t(`orderStatus.${status}`);
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
