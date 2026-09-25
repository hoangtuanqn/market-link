import { useTranslation } from 'react-i18next';
import MarketCard from '@/components/MarketCard';
import type { MarketType } from '@/types/market.types';

const NearbyMarkets = ({ markets }: { markets: MarketType[] }) => {
  const { t } = useTranslation('Home');
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-h2">{t('nearby.title')}</h2>
        <span className="text-small text-ink-muted">{t('nearby.note')}</span>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {markets.map((m) => (
          <MarketCard key={m.id} market={m} />
        ))}
      </div>
    </section>
  );
};

export default NearbyMarkets;
