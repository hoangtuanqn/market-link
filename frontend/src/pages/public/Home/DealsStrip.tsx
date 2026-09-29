import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import DealApi from '@/api-requests/deal.requests';
import DealCard from '@/components/DealCard';
import useRequest from '@/hooks/useRequest';

/** Four cards fill one row on desktop. */
const STRIP_SIZE = 4;

/**
 * FR-125 (spec §4.5.4): a strip of near-expiry deals on the home page, only when there are some. A teaser, so it shows
 * nothing while it loads, fails or finds none; the /deals page carries the full loading / empty / error states.
 */
const DealsStrip = () => {
  const { t } = useTranslation('Home');
  const { state } = useRequest('home-deals', () => DealApi.list({ pageSize: STRIP_SIZE }));
  if (state.kind !== 'ready' || state.data.items.length === 0) return null;

  return (
    <section aria-labelledby="home-deals-title" className="flex flex-col gap-4">
      <div className="border-line flex flex-wrap items-end justify-between gap-4 border-b border-dashed pb-4">
        <div className="flex flex-col gap-1">
          <h2 id="home-deals-title" className="text-h2">
            {t('deals.title')}
          </h2>
          <p className="text-small text-ink-muted">{t('deals.note')}</p>
        </div>
        <Link to="/deals" className="text-brand inline-flex min-h-11 items-center font-semibold hover:underline">
          {t('deals.all')}
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        {state.data.items.map((d) => (
          <DealCard key={`${d.productId}@${d.stockDate}`} deal={d} />
        ))}
      </div>
    </section>
  );
};

export default DealsStrip;
