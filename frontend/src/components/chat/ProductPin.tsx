import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import ProductApi from '@/api-requests/product.requests';
import useRequest from '@/hooks/useRequest';
import Helper from '@/utils/helper';
import { perUnit } from '@/lib/format';

type Props = {
  productId: number;
  compact?: boolean;
};

export default function ProductPin({ productId, compact }: Props) {
  const { t } = useTranslation('common');
  const { state } = useRequest(`product:${productId}`, () => ProductApi.get(productId).then((res) => res.product));

  if (state.kind === 'loading') {
    return (
      <div className={Helper.cn('bg-surface-raised border-line-strong rounded-md border p-2', compact && 'text-small')}>
        {t('notify.list.loading')}
      </div>
    );
  }

  if (state.kind === 'error' || !state.data) {
    return (
      <div
        className={Helper.cn(
          'bg-surface-raised border-line-strong text-ink-muted rounded-md border p-2',
          compact && 'text-small',
        )}
      >
        {t('chat.productGone')}
      </div>
    );
  }

  const data = state.data;

  return (
    <Link
      to={`/products/${productId}`}
      className={Helper.cn(
        'bg-surface-raised border-line-strong hover:border-ink flex items-center gap-2 rounded-md border no-underline transition-colors',
        // Helper.cn does not merge conflicting classes: pick one padding, do not set p-2 and then override it with p-1
        compact ? 'text-small p-1' : 'p-2',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="text-ink truncate font-sans font-semibold">{data.name}</div>
        <div className="text-brand font-hand mt-1 text-lg leading-none">{perUnit(data.price, data.unit)}</div>
      </div>
    </Link>
  );
}
