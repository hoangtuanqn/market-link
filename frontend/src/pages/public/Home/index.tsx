import { useTranslation } from 'react-i18next';
import CatalogApi from '@/api-requests/catalog.requests';
import { LoadError } from '@/components/ui/data-state';
import { freshProducts } from '@/data/home';
import useRequest from '@/hooks/useRequest';
import type { MarketType } from '@/types/market.types';
import FreshProducts from './FreshProducts';
import Hero from './Hero';
import HowItWorks from './HowItWorks';
import NearbyMarkets from './NearbyMarkets';

/** Contract §3 caps a page at 50; every market of the city fits in one call. */
const FETCH_SIZE = 50;
const NO_MARKETS: MarketType[] = [];

/** FR-010 FR-023 FR-077 — markets come from the API; the fresh products are still the demo set until C3. */
const HomePage = () => {
  const { t } = useTranslation('Home');
  const { state: load, retry } = useRequest('markets', () =>
    CatalogApi.listMarkets({ pageSize: FETCH_SIZE }).then((result) => result.items),
  );
  const markets = load.kind === 'ready' ? load.data : NO_MARKETS;

  return (
    <div className="flex flex-col gap-8">
      <Hero markets={markets} />
      {load.kind === 'error' ? (
        <LoadError noun={t('nearby.noun')} onRetry={retry} />
      ) : (
        <NearbyMarkets markets={markets.slice(0, 4)} loading={load.kind === 'loading'} />
      )}
      <FreshProducts products={freshProducts} />
      <HowItWorks />
    </div>
  );
};

export default HomePage;
