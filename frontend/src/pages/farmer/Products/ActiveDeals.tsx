import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DealApi, { type FarmerDealDto } from '@/api-requests/deal.requests';
import { stockDay } from '@/components/stockDay';
import { Button } from '@/components/ui/button';
import { LoadError } from '@/components/ui/data-state';
import { Table, type TableColumn } from '@/components/ui/table';
import useRequest from '@/hooks/useRequest';
import { perUnit, units } from '@/lib/format';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

type ActiveDealsProps = {
  version: number;
};

const keyOf = (d: FarmerDealDto) => `${d.productId}@${d.stockDate}`;

const ActiveDeals = ({ version }: ActiveDealsProps) => {
  const { t } = useTranslation('FarmerProducts');
  const { t: tc } = useTranslation();
  const { state, retry, mutate } = useRequest(`my-deals:${version}`, () => DealApi.mine());
  const [last, setLast] = useState<FarmerDealDto[] | null>(null);
  if (state.kind === 'ready' && state.data !== last) setLast(state.data);
  const [busy, setBusy] = useState<string | null>(null);

  const remove = async (d: FarmerDealDto) => {
    setBusy(keyOf(d));
    try {
      await DealApi.remove(d.productId, d.stockDate);
      mutate((list) => list.filter((x) => keyOf(x) !== keyOf(d)));
      Notification.success({
        title: t('deals.removed'),
        text: t('deals.removedText', { name: d.productName, day: stockDay(d.stockDate) ?? d.stockDate }),
      });
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setBusy(null);
    }
  };

  if (state.kind === 'loading' && last === null) {
    return (
      <p role="status" className="text-ink-muted">
        {t('deals.loading')}
      </p>
    );
  }
  if (state.kind === 'error') return <LoadError noun={t('deals.noun')} onRetry={retry} />;
  const deals = state.kind === 'ready' ? state.data : (last ?? []);
  if (deals.length === 0) return null;

  const columns: TableColumn<FarmerDealDto>[] = [
    { key: 'p', label: t('deals.col.product'), render: (d) => <b>{d.productName}</b> },
    { key: 'd', label: t('deals.col.day'), render: (d) => stockDay(d.stockDate) ?? d.stockDate },
    {
      key: 'o',
      label: t('deals.col.discount'),
      align: 'num',
      render: (d) => (
        <>
          {t('deals.off', { percent: d.discountPercent })}
          <span className="text-ink-muted text-small block font-normal">
            {t('deals.price', { price: perUnit(d.unitPrice, d.unit), was: perUnit(d.listPrice, d.unit) })}
          </span>
        </>
      ),
    },
    { key: 'l', label: t('deals.col.left'), align: 'num', render: (d) => units(d.quantityAvailable, d.unit) },
    {
      key: 'u',
      label: t('deals.col.until'),
      render: (d) => t('deals.until', { day: stockDay(d.bestBefore) ?? d.bestBefore, count: d.daysLeft }),
    },
    {
      key: 'a',
      label: '',
      align: 'actions',
      render: (d) => (
        <Button variant="secondary" size="sm" disabled={busy === keyOf(d)} onClick={() => void remove(d)}>
          {t('deals.remove')}
        </Button>
      ),
    },
  ];

  return (
    <section aria-labelledby="farmer-deals-title" className="flex flex-col gap-3">
      <h2 id="farmer-deals-title" className="text-h3">
        {t('deals.title', { count: deals.length })}
      </h2>
      <Table columns={columns} rows={deals} />
    </section>
  );
};

export default ActiveDeals;
