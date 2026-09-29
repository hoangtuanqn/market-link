import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MarketCard from '@/components/MarketCard';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import { Chip } from '@/components/ui/chip';
import type { MarketType } from '@/types/market.types';

type NearbyMarketsProps = {
  markets: MarketType[];
  /** True while the request is out: as many placeholders as the grid is about to hold (FR-084). */
  loading?: boolean;
};

const NearbyMarkets = ({ markets, loading = false }: NearbyMarketsProps) => {
  const { t } = useTranslation('Home');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');

  const districts = useMemo(() => {
    const set = new Set<string>();
    markets.forEach((m) => {
      if (m.area) {
        set.add(m.area);
      } else if (m.address) {
        // Fallback: extract common district name patterns if area is blank
        const match = /(Thủ Đức|District 7|Bình Thạnh|Quận \d+|Thảo Điền)/i.exec(m.address);
        if (match) set.add(match[1]);
      }
    });
    return Array.from(set);
  }, [markets]);

  const displayedMarkets = useMemo(() => {
    if (selectedDistrict === 'all') return markets.slice(0, 4);
    const filtered = markets.filter(
      (m) => m.area === selectedDistrict || (m.address && m.address.includes(selectedDistrict)),
    );
    return filtered.length > 0 ? filtered.slice(0, 4) : markets.slice(0, 4);
  }, [markets, selectedDistrict]);

  return (
    <section className="flex flex-col gap-6">
      <div className="border-line flex flex-wrap items-end justify-between gap-4 border-b border-dashed pb-4">
        <div>
          <span className="text-brand text-[12px] font-bold tracking-widest uppercase">{t('nearby.eyebrow')}</span>
          <h2 className="text-h2 mt-1">{t('nearby.title')}</h2>
          <p className="text-ink-muted text-small mt-0.5">{t('nearby.note')}</p>
        </div>

        {districts.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Chip pressed={selectedDistrict === 'all'} onClick={() => setSelectedDistrict('all')}>
              {t('nearby.filterAll')} ({markets.length})
            </Chip>
            {districts.map((d) => (
              <Chip key={d} pressed={selectedDistrict === d} onClick={() => setSelectedDistrict(d)}>
                {d}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {loading ? (
          <MarketCardSkeleton count={4} />
        ) : displayedMarkets.length > 0 ? (
          displayedMarkets.map((m) => <MarketCard key={m.id} market={m} />)
        ) : (
          <p className="text-ink-muted col-span-full py-8 text-center">{t('nearby.empty')}</p>
        )}
      </div>
    </section>
  );
};

export default NearbyMarkets;
