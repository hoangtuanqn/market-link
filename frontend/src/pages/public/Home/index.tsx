import { useTranslation } from 'react-i18next';
import CatalogApi from '@/api-requests/catalog.requests';
import ProductApi from '@/api-requests/product.requests';
import { LoadError } from '@/components/ui/data-state';
import useRequest from '@/hooks/useRequest';
import type { MarketType } from '@/types/market.types';
import type { ProductType } from '@/types/product.types';
import FreshProducts from './FreshProducts';
import Hero from './Hero';
import HowItWorks from './HowItWorks';
import NearbyMarkets from './NearbyMarkets';

/** Contract §3 caps a page at 50; every market of the city fits in one call. */
const FETCH_SIZE = 50;
/** "Fresh this week": the newest listings, three per row on desktop. */
const FRESH_COUNT = 6;
const NO_MARKETS: MarketType[] = [];
const NO_PRODUCTS: ProductType[] = [];

/** FR-010 FR-020 FR-077 — markets and the freshest products come from the API. */
const HomePage = () => {
  const { t } = useTranslation('Home');
  const { state: marketsLoad, retry: retryMarkets } = useRequest('markets', () =>
    CatalogApi.listMarkets({ pageSize: FETCH_SIZE }).then((result) => result.items),
  );
  const { state: freshLoad, retry: retryFresh } = useRequest('fresh-products', () =>
    ProductApi.list({ pageSize: FRESH_COUNT, sort: 'newest' }).then((result) => result.items),
  );
  const markets = marketsLoad.kind === 'ready' ? marketsLoad.data : NO_MARKETS;
  const fresh = freshLoad.kind === 'ready' ? freshLoad.data : NO_PRODUCTS;

  return (
    <div className="flex flex-col gap-8">
      <Hero markets={markets} />
      {marketsLoad.kind === 'error' ? (
        <LoadError noun={t('nearby.noun')} onRetry={retryMarkets} />
      ) : (
        <NearbyMarkets markets={markets.slice(0, 4)} loading={marketsLoad.kind === 'loading'} />
      )}
      {freshLoad.kind === 'error' ? (
        <LoadError noun={t('fresh.noun')} onRetry={retryFresh} />
      ) : (
        <FreshProducts products={fresh} loading={freshLoad.kind === 'loading'} />
      )}
      <HowItWorks />
    </div>
  );
};

export default HomePage;
