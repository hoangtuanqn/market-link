import { useTranslation } from 'react-i18next';
import CatalogApi, { type CategoryType } from '@/api-requests/catalog.requests';
import ProductApi from '@/api-requests/product.requests';
import StallApi, { type StallDetailDto } from '@/api-requests/stall.requests';
import { LoadError } from '@/components/ui/data-state';
import useRequest from '@/hooks/useRequest';
import type { MarketType } from '@/types/market.types';
import type { ProductType } from '@/types/product.types';
import CategoryBrowse from './CategoryBrowse';
import DealsStrip from './DealsStrip';
import FarmerCtaBanner from './FarmerCtaBanner';
import FeaturedFarmers from './FeaturedFarmers';
import FreshProducts from './FreshProducts';
import Hero from './Hero';
import HowItWorks from './HowItWorks';
import NearbyMarkets from './NearbyMarkets';
import ValuePillars from './ValuePillars';

const FETCH_SIZE = 50;
const FRESH_COUNT = 6;
const NO_MARKETS: MarketType[] = [];
const NO_PRODUCTS: ProductType[] = [];
const NO_CATEGORIES: CategoryType[] = [];
const NO_STALLS: StallDetailDto[] = [];

const HomePage = () => {
  const { t } = useTranslation('Home');

  const { state: marketsLoad, retry: retryMarkets } = useRequest('markets', () =>
    CatalogApi.listMarkets({ pageSize: FETCH_SIZE }).then((result) => result.items),
  );
  const { state: freshLoad, retry: retryFresh } = useRequest('fresh-products', () =>
    ProductApi.list({ pageSize: FRESH_COUNT, sort: 'newest' }).then((result) => result.items),
  );
  const { state: categoriesLoad } = useRequest('categories', () => CatalogApi.listCategories());
  const { state: stallsLoad, retry: retryStalls } = useRequest('featured-stalls', () =>
    StallApi.list({ pageSize: 3 })
      .then((result) => Promise.all(result.items.map((s) => StallApi.get(s.farmerId).catch(() => null))))
      .then((details) => details.filter((d): d is StallDetailDto => d !== null)),
  );

  const markets = marketsLoad.kind === 'ready' ? marketsLoad.data : NO_MARKETS;
  const fresh = freshLoad.kind === 'ready' ? freshLoad.data : NO_PRODUCTS;
  const categories = categoriesLoad.kind === 'ready' ? categoriesLoad.data : NO_CATEGORIES;
  const stalls = stallsLoad.kind === 'ready' ? stallsLoad.data : NO_STALLS;

  return (
    <div className="flex flex-col gap-16 lg:gap-20">
      <Hero markets={markets} />

      <ValuePillars />

      <CategoryBrowse categories={categories} loading={categoriesLoad.kind === 'loading'} />

      {marketsLoad.kind === 'error' ? (
        <LoadError noun={t('nearby.noun')} onRetry={retryMarkets} />
      ) : (
        <NearbyMarkets markets={markets} loading={marketsLoad.kind === 'loading'} />
      )}

      <DealsStrip />

      {freshLoad.kind === 'error' ? (
        <LoadError noun={t('fresh.noun')} onRetry={retryFresh} />
      ) : (
        <FreshProducts products={fresh} loading={freshLoad.kind === 'loading'} />
      )}

      <HowItWorks />

      {stallsLoad.kind === 'error' ? (
        <LoadError noun={t('farmers.noun')} onRetry={retryStalls} />
      ) : (
        <FeaturedFarmers stalls={stalls} loading={stallsLoad.kind === 'loading'} />
      )}

      <FarmerCtaBanner />
    </div>
  );
};

export default HomePage;
