import { useTranslation } from 'react-i18next';
import MarketCard from '@/components/MarketCard';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import type { MarketType } from '@/types/market.types';

type NearbyMarketsProps = {
  markets: MarketType[];
  /** True while the request is out: as many placeholders as the grid is about to hold (FR-084). */
  loading?: boolean;
};

const NearbyMarkets = ({ markets, loading = false }: NearbyMarketsProps) => {
  const { t } = useTranslation('Home');
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-h2">{t('nearby.title')}</h2>
        <span className="text-small text-ink-muted">{t('nearby.note')}</span>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {loading ? <MarketCardSkeleton count={4} /> : markets.map((m) => <MarketCard key={m.id} market={m} />)}
      </div>
    </section>
  );
};

export default NearbyMarkets;
