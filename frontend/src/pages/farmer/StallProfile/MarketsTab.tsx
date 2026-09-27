import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { StallDetailDto, StallMarketDto } from '@/api-requests/stall.requests';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { dayList, formatClock } from '@/lib/format';
import type { MarketType } from '@/types/market.types';
import type { MarketSettings } from './constants';
import StallMarketCard from './StallMarketCard';

type MarketsTabProps = {
  stall: StallDetailDto;
  allMarkets: MarketType[];
  marketsLoading: boolean;
  approved: boolean;
  busyMarket: number | null;
  savingMarkets: boolean;
  marketById: (id: number) => MarketType | undefined;
  settingsOf: (sm: StallMarketDto) => MarketSettings;
  onToggleMarket: (m: MarketType, checked: boolean) => void;
  onUpdate: (sm: StallMarketDto, patch: Partial<MarketSettings>) => void;
  onSave: () => void;
};

/** The markets tab: which markets the stall sells at, then one card of days, window and pin per market. */
const MarketsTab = ({
  stall,
  allMarkets,
  marketsLoading,
  approved,
  busyMarket,
  savingMarkets,
  marketById,
  settingsOf,
  onToggleMarket,
  onUpdate,
  onSave,
}: MarketsTabProps) => {
  const { t } = useTranslation('FarmerStallProfile');
  return (
    <div className="flex flex-col gap-6">
      {!approved && (
        <Banner variant="info" title={t(`status.${stall.approvalStatus}`)}>
          {t('markets.notApproved')}
        </Banner>
      )}
      <Card className="flex flex-col gap-3 p-6">
        <h2 className="text-h3">{t('markets.title')}</h2>
        <p className="text-small text-ink-muted">{t('markets.intro')}</p>
        {marketsLoading ? (
          <MarketCardSkeleton count={2} />
        ) : (
          <div className="flex flex-col gap-2">
            {allMarkets.map((m) => (
              <Checkbox
                key={m.id}
                id={`mk-${m.id}`}
                checked={stall.markets.some((sm) => sm.marketId === m.id)}
                disabled={!approved || busyMarket === m.id}
                onChange={(e) => onToggleMarket(m, e.target.checked)}
              >
                <b className="block">{m.name}</b>
                <span className="text-ink-muted block text-[13px]">
                  {dayList(m.days)} · {formatClock(m.open)}–{formatClock(m.close)}
                </span>
              </Checkbox>
            ))}
          </div>
        )}
      </Card>

      {stall.markets.map((sm, index) => (
        <StallMarketCard
          key={sm.farmerMarketId}
          sm={sm}
          market={marketById(sm.marketId)}
          settings={settingsOf(sm)}
          withMap={index === 0}
          onUpdate={(patch) => onUpdate(sm, patch)}
        />
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onSave} disabled={!approved || savingMarkets || stall.markets.length === 0}>
          {t('markets.save')}
        </Button>
        <Link to="/farmer/slots" className="text-small text-brand underline">
          {t('markets.slotsLink')}
        </Link>
      </div>
    </div>
  );
};

export default MarketsTab;
