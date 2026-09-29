import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { USER_ROLE } from '@/constants/enums';
import useRequest from '@/hooks/useRequest';
import useSession from '@/hooks/useSession';
import { fetchOrderSummary } from '@/lib/chat/orderSummary';
import { formatClock, formatDate, money } from '@/lib/format';
import Helper from '@/utils/helper';

const localDay = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
};

type Props = { orderId: number; compact?: boolean };

export default function OrderPin({ orderId, compact }: Props) {
  const { t } = useTranslation('common');
  const { user } = useSession();
  const { state } = useRequest(`order-pin:${orderId}`, () => fetchOrderSummary(orderId));
  const box = Helper.cn('bg-surface-raised border-line-strong rounded-md border', compact ? 'text-small p-1' : 'p-2');

  if (state.kind === 'loading') {
    return (
      <div role="status" className={box}>
        {t('notify.list.loading')}
      </div>
    );
  }

  if (state.kind === 'error') {
    return <div className={Helper.cn(box, 'text-ink-muted')}>{t('chat.orderGone')}</div>;
  }

  const o = state.data;
  const to = user?.role === USER_ROLE.FARMER ? `/farmer/orders/${o.orderId}` : `/orders/${o.orderId}`;

  return (
    <Link to={to} className={Helper.cn(box, 'hover:border-ink block no-underline')}>
      <span className="text-ink block font-sans font-semibold">{t('chat.orderLabel', { code: o.orderCode })}</span>
      <span className="text-small text-ink-muted block">
        {t('chat.orderPickup', {
          date: formatDate(localDay(o.pickupDate)),
          start: formatClock(o.pickupStart),
          end: formatClock(o.pickupEnd),
        })}
      </span>
      <span className="text-brand font-hand block text-lg leading-none">{money(o.totalAmount)}</span>
    </Link>
  );
}
