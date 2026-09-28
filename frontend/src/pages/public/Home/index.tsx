import { useTranslation } from 'react-i18next';
import CatalogApi, { type CategoryType } from '@/api-requests/catalog.requests';
import ProductApi from '@/api-requests/product.requests';
import StallApi, { type StallSummaryDto } from '@/api-requests/stall.requests';
import { LoadError } from '@/components/ui/data-state';
import useRequest from '@/hooks/useRequest';
import type { MarketType } from '@/types/market.types';
import type { ProductType } from '@/types/product.types';
import CategoryBrowse from './CategoryBrowse';
import CommunityReviews from './CommunityReviews';
import DealsStrip from './DealsStrip';
import FarmerCtaBanner from './FarmerCtaBanner';
import FeaturedFarmers from './FeaturedFarmers';
import FreshProducts from './FreshProducts';
import Hero from './Hero';
import HowItWorks from './HowItWorks';
import NearbyMarkets from './NearbyMarkets';
import ValuePillars from './ValuePillars';

/** Contract §3 caps a page at 50; every market of the city fits in one call. */
const FETCH_SIZE = 50;
/** "Fresh this week": the newest listings, three per row on desktop. */
const FRESH_COUNT = 6;
const NO_MARKETS: MarketType[] = [];
const NO_PRODUCTS: ProductType[] = [];
const NO_CATEGORIES: CategoryType[] = [];
const NO_STALLS: StallSummaryDto[] = [];

/** FR-010 FR-020 FR-077 — markets, categories, freshest produce, and grower stalls. */
const HomePage = () => {
  const { t } = useTranslation('Home');

  const { state: marketsLoad, retry: retryMarkets } = useRequest('markets', () =>
    CatalogApi.listMarkets({ pageSize: FETCH_SIZE }).then((result) => result.items),
  );
  const { state: freshLoad, retry: retryFresh } = useRequest('fresh-products', () =>
    ProductApi.list({ pageSize: FRESH_COUNT, sort: 'newest' }).then((result) => result.items),
  );
  const { state: categoriesLoad } = useRequest('categories', () => CatalogApi.listCategories());
  const { state: stallsLoad } = useRequest('featured-stalls', () =>
    StallApi.list({ pageSize: 3 }).then((result) => result.items),
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

      <FeaturedFarmers stalls={stalls} loading={stallsLoad.kind === 'loading'} />

      <CommunityReviews />

      <FarmerCtaBanner />
    </div>
  );
};

export default HomePage;
