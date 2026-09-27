import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { StallSummaryDto } from '@/api-requests/stall.requests';
import Rating from '@/components/Rating';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type FeaturedFarmersProps = {
  stalls?: StallSummaryDto[];
  loading?: boolean;
};

// Fallback showcase farmers if stalls list is empty
const SAMPLE_FARMERS: StallSummaryDto[] = [
  {
    farmerId: 1,
    stallName: 'Cô Tư Garden',
    contactPerson: 'Nguyễn Thị Tư',
    ratingAvg: 4.9,
    ratingCount: 42,
    operatingDays: [5, 6, 0],
    pickupStartTime: '06:30',
    pickupEndTime: '11:30',
  },
  {
    farmerId: 2,
    stallName: 'Út Hiền Orchard',
    contactPerson: 'Lê Văn Hiền',
    ratingAvg: 4.8,
    ratingCount: 38,
    operatingDays: [6, 0],
    pickupStartTime: '07:00',
    pickupEndTime: '12:00',
  },
  {
    farmerId: 4,
    stallName: 'Gió Nam Bakery & Farm',
    contactPerson: 'Trần Minh Nam',
    ratingAvg: 5.0,
    ratingCount: 29,
    operatingDays: [6, 0],
    pickupStartTime: '06:00',
    pickupEndTime: '10:30',
  },
];

const FARMER_BIOS: Record<number, string> = {
  1: 'Third-generation organic vegetable grower from Củ Chi, delivering morning-picked leafy greens with zero chemical pesticides.',
  2: 'Specializing in naturally ripened green-skin pomelos, sweet mangoes, and dragon fruits from sustainable Long An orchards.',
  3: 'Highland farm bringing fresh heirloom tomatoes, bell peppers, and crisp lettuces cultivated with organic compost in Đà Lạt.',
  4: 'Artisan sourdough baker and microgreen grower, baking naturally fermented rustic loaves at dawn for market mornings.',
};

const FeaturedFarmers = ({ stalls = [], loading = false }: FeaturedFarmersProps) => {
  const { t } = useTranslation('Home');

  const displayedStalls = stalls.length > 0 ? stalls.slice(0, 3) : SAMPLE_FARMERS;

  return (
    <section className="flex flex-col gap-6">
      <div className="border-line flex flex-wrap items-end justify-between gap-4 border-b border-dashed pb-4">
        <div>
          <span className="text-brand text-[12px] font-bold tracking-widest uppercase">{t('farmers.eyebrow')}</span>
          <h2 className="text-h2 mt-1">{t('farmers.title')}</h2>
          <p className="text-ink-muted text-small mt-0.5">{t('farmers.desc')}</p>
        </div>
        <Link to="/search?scope=farmer" className="text-brand font-semibold hover:underline">
          {t('farmers.all')}
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="flex animate-pulse flex-col gap-4 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-surface-sunken size-14 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="bg-surface-sunken h-4 w-3/4 rounded" />
                    <div className="bg-surface-sunken h-3 w-1/2 rounded" />
                  </div>
                </div>
                <div className="bg-surface-sunken h-12 w-full rounded" />
                <div className="bg-surface-sunken mt-auto h-8 w-1/3 rounded" />
              </Card>
            ))
          : displayedStalls.map((stall) => (
              <Card
                key={stall.farmerId}
                as="article"
                className="hover:border-brand/40 flex flex-col gap-4 rounded-xl p-6 shadow-xs transition-transform duration-150 hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-4">
                  <div
                    aria-hidden="true"
                    className="border-brand bg-surface-sunken font-hand text-brand flex size-15 shrink-0 items-center justify-center rounded-full border-2 text-2xl font-bold shadow-2xs"
                  >
                    {(stall.stallName || '?').trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[18px] leading-tight font-bold">
                      <Link to={`/stalls/${stall.farmerId}`} className="text-inherit hover:underline">
                        {stall.stallName}
                      </Link>
                    </h3>
                    <p className="text-ink-muted text-small mt-0.5 truncate">
                      {t('farmers.grower')}: <b className="text-ink">{stall.contactPerson}</b>
                    </p>
                    <div className="mt-1">
                      <Rating value={stall.ratingAvg} count={stall.ratingCount} />
                    </div>
                  </div>
                </div>

                <p className="text-ink-muted text-[14px] leading-relaxed italic">
                  “
                  {FARMER_BIOS[stall.farmerId] ??
                    'Committed to pesticide-free, sustainably cultivated harvests straight from local soil to your family table.'}
                  ”
                </p>

                <div className="border-line mt-auto flex items-center justify-between border-t border-dashed pt-4">
                  <span className="text-ink-muted text-[13px]">
                    {t('farmers.at')}: <b>Thảo Điền Market</b>
                  </span>
                  <ButtonLink to={`/stalls/${stall.farmerId}`} variant="secondary" size="sm">
                    {t('farmers.visit')}
                  </ButtonLink>
                </div>
              </Card>
            ))}
      </div>
    </section>
  );
};

export default FeaturedFarmers;
