import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { StallDetailDto } from '@/api-requests/stall.requests';
import Rating from '@/components/Rating';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataState } from '@/components/ui/data-state';

type FeaturedFarmersProps = {
  /** Full stall profiles (GET /farmers/{id}): the card shows the stall's own bio and markets, nothing made up. */
  stalls?: StallDetailDto[];
  loading?: boolean;
};

const FeaturedFarmers = ({ stalls = [], loading = false }: FeaturedFarmersProps) => {
  const { t } = useTranslation('Home');

  const displayedStalls = stalls.slice(0, 3);

  return (
    <section className="flex flex-col gap-6">
      <div className="border-line flex flex-wrap items-end justify-between gap-4 border-b border-dashed pb-4">
        <div>
          <span className="text-brand text-[12px] font-bold tracking-widest uppercase">{t('farmers.eyebrow')}</span>
          <h2 className="text-h2 mt-1">{t('farmers.title')}</h2>
          <p className="text-ink-muted text-small mt-0.5">{t('farmers.desc')}</p>
        </div>
        <Link
          to="/search?scope=farmer"
          className="text-brand inline-flex min-h-11 items-center font-semibold hover:underline"
        >
          {t('farmers.all')}
        </Link>
      </div>

      {!loading && displayedStalls.length === 0 ? (
        <DataState title={t('farmers.empty')} text={t('farmers.emptyText')} />
      ) : (
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
                  className="hover:border-brand/40 relative flex flex-col gap-4 rounded-xl p-6 shadow-xs transition-transform duration-150 hover:-translate-y-0.5"
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
                        {/* after:inset-0 stretches the hit area over the whole card; the button below
                          sits above it with z-2. */}
                        <Link
                          to={`/stalls/${stall.farmerId}`}
                          className="text-inherit after:absolute after:inset-0 hover:underline"
                        >
                          {stall.stallName}
                        </Link>
                      </h3>
                      <p className="text-ink-muted text-small mt-0.5 truncate">
                        {t('farmers.grower')}: <b className="text-ink">{stall.contactPerson}</b>
                      </p>
                      {stall.ratingCount > 0 && (
                        <div className="mt-1">
                          <Rating value={Number(stall.ratingAvg)} count={stall.ratingCount} />
                        </div>
                      )}
                    </div>
                  </div>

                  {stall.description && (
                    <p className="text-ink-muted line-clamp-3 text-[14px] leading-relaxed italic">
                      “{stall.description}”
                    </p>
                  )}

                  <div className="border-line mt-auto flex items-center justify-between border-t border-dashed pt-4">
                    <span className="text-ink-muted min-w-0 text-[13px]">
                      {stall.markets.length > 0 && (
                        <>
                          {t('farmers.at')}: <b>{stall.markets.map((m) => m.marketName).join(', ')}</b>
                        </>
                      )}
                    </span>
                    <ButtonLink to={`/stalls/${stall.farmerId}`} variant="secondary" size="sm" className="relative z-2">
                      {t('farmers.visit')}
                    </ButtonLink>
                  </div>
                </Card>
              ))}
        </div>
      )}
    </section>
  );
};

export default FeaturedFarmers;
