import MarketCard from '@/components/MarketCard';
import type { MarketType } from '@/types/market.types';

const NearbyMarkets = ({ markets }: { markets: MarketType[] }) => {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-h2">Markets near you</h2>
        <span className="text-small text-ink-muted">Distances from your saved address in Thảo Điền</span>
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
