import { useTranslation } from 'react-i18next';
import DealApi from '@/api-requests/deal.requests';
import { stockDay } from '@/components/stockDay';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadError } from '@/components/ui/data-state';
import useAddDeal from '@/hooks/useAddDeal';
import useRequest from '@/hooks/useRequest';
import { perUnit, units } from '@/lib/format';

const MAX_DAYS = 14;

const ProductDeals = ({ productId }: { productId: number }) => {
  const { t } = useTranslation('ProductDetail');
  const addDeal = useAddDeal();
  const { state, retry } = useRequest(`product-deals:${productId}`, () =>
    DealApi.list({ productId, pageSize: MAX_DAYS }),
  );
  if (state.kind === 'loading') return null;
  if (state.kind === 'error') return <LoadError noun={t('deals.noun')} onRetry={retry} />;
  const deals = state.data.items;
  if (deals.length === 0) return null;

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
              <Button variant="secondary" size="sm" onClick={() => addDeal(d)}>
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
