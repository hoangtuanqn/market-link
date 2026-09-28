import { useTranslation } from 'react-i18next';
import DealApi, { type DealDto } from '@/api-requests/deal.requests';
import { stockDay } from '@/components/stockDay';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadError } from '@/components/ui/data-state';
import useRequest from '@/hooks/useRequest';
import { Cart } from '@/lib/cart';
import { perUnit, units } from '@/lib/format';
import Notification from '@/utils/notification';

/** Every pickup day of the 14-day window fits. */
const MAX_DAYS = 14;

/**
 * FR-125 (spec §4.5.4): the pickup days this product is on a near-expiry deal, each added to the cart with its own day.
 * Nothing while it loads or when there is none, since the price block above already sells the product.
 */
const ProductDeals = ({ productId }: { productId: number }) => {
  const { t } = useTranslation('ProductDetail');
  const { t: tc } = useTranslation();
  const { state, retry } = useRequest(`product-deals:${productId}`, () =>
    DealApi.list({ productId, pageSize: MAX_DAYS }),
  );
  if (state.kind === 'loading') return null;
  if (state.kind === 'error') return <LoadError noun={t('deals.noun')} onRetry={retry} />;
  const deals = state.data.items;
  if (deals.length === 0) return null;

  const add = (d: DealDto, day: string) => {
    Cart.add({
      productId: d.productId,
      name: d.name,
      unit: d.unit,
      price: d.unitPrice,
      max: d.quantityAvailable,
      farmerId: d.farmerId,
      stallName: d.stallName,
      pickupDate: d.stockDate,
    });
    Notification.success({ title: tc('deal.added.title'), text: tc('deal.added.text', { name: d.name, day }) });
  };

  return (
    <Card className="flex flex-col gap-3 p-6">
      <h2 className="text-h3">{t('deals.title')}</h2>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {deals.map((d) => {
          const day = stockDay(d.stockDate) ?? d.stockDate;
          return (
            <li
              key={d.stockDate}
              className="border-line flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"
            >
              <span className="min-w-0">
                <b className="block">{t('deals.day', { day, percent: d.discountPercent })}</b>
                <span className="text-small text-ink-muted">
                  {t('deals.detail', {
                    price: perUnit(d.unitPrice, d.unit),
                    was: perUnit(d.listPrice, d.unit),
                    until: stockDay(d.bestBefore) ?? d.bestBefore,
                    qty: units(d.quantityAvailable, d.unit),
                  })}
                </span>
              </span>
              <Button variant="secondary" size="sm" onClick={() => add(d, day)}>
                {t('deals.add', { day })}
              </Button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
};

export default ProductDeals;
