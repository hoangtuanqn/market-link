import { useTranslation } from 'react-i18next';
import type { StallMarketDto } from '@/api-requests/stall.requests';
import LocationPicker from '@/components/LocationPicker';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/input';
import { dayList, dayName, formatClock } from '@/lib/format';
import type { MarketType } from '@/types/market.types';
import Notification from '@/utils/notification';
import type { MarketSettings } from './constants';

type StallMarketCardProps = {
  sm: StallMarketDto;
  /** The market itself, once the market list has loaded. */
  market: MarketType | undefined;
  settings: MarketSettings;
  /** Only the first market gets the map; the others take coordinates as numbers. */
  withMap: boolean;
  onUpdate: (patch: Partial<MarketSettings>) => void;
};

/** One market the stall sells at: stall code, days, pickup window, and where the stall stands. */
const StallMarketCard = ({ sm, market: m, settings: s, withMap, onUpdate }: StallMarketCardProps) => {
  const { t } = useTranslation('FarmerStallProfile');
  const marketDays = m?.days ?? [0, 1, 2, 3, 4, 5, 6];
  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-h3">{sm.marketName}</h2>
        {m && (
          <span className="text-small text-ink-muted">
            {t('markets.runs', {
              days: dayList(m.days),
              open: formatClock(m.open),
              close: formatClock(m.close),
            })}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field
          id={`code${sm.farmerMarketId}`}
          label={t('markets.code')}
          value={s.code}
          onChange={(e) => onUpdate({ code: e.target.value })}
          hint={t('markets.codeHint')}
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-small font-bold">{t('markets.days')}</span>
          <div className="mt-0.5 flex flex-wrap gap-3">
            {marketDays.map((d) => (
              <Checkbox
                key={d}
                id={`d${sm.farmerMarketId}-${d}`}
                checked={s.days.includes(d)}
                onChange={(e) =>
                  onUpdate({
                    days: e.target.checked ? [...s.days, d] : s.days.filter((x) => x !== d),
                  })
                }
              >
                {dayName(d)}
              </Checkbox>
            ))}
          </div>
        </div>
        <Field
          id={`ps${sm.farmerMarketId}`}
          label={t('markets.start')}
          type="time"
          value={s.start}
          onChange={(e) => onUpdate({ start: e.target.value })}
        />
        <Field
          id={`pe${sm.farmerMarketId}`}
          label={t('markets.end')}
          type="time"
          value={s.end}
          onChange={(e) => onUpdate({ end: e.target.value })}
        />
      </div>

      {withMap && m ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-small font-bold">{t('markets.location')}</span>
            <LocationPicker
              label={t('markets.mapLabel')}
              className="min-h-80"
              market={{ lat: m.lat, lng: m.lng, name: m.name }}
              lat={s.lat}
              lng={s.lng}
              pinLabel={t('map.yourStall')}
              onMove={(lat, lng) => onUpdate({ lat, lng })}
            />
            <p className="text-caption text-ink-muted">{t('markets.mapHint')}</p>
          </div>
          <div className="flex flex-col gap-3">
            <Field
              id={`lat${sm.farmerMarketId}`}
              label={t('markets.lat')}
              value={s.lat.toFixed(6)}
              onChange={(e) => onUpdate({ lat: Number(e.target.value) || s.lat })}
            />
            <Field
              id={`lng${sm.farmerMarketId}`}
              label={t('markets.lng')}
              value={s.lng.toFixed(6)}
              onChange={(e) => onUpdate({ lng: Number(e.target.value) || s.lng })}
            />
            <Button
              variant="secondary"
              size="sm"
              className="self-start"
              onClick={() => {
                onUpdate({ lat: m.lat, lng: m.lng });
                Notification.success({
                  title: t('markets.pinMoved'),
                  text: t('markets.pinMovedText'),
                });
              }}
            >
              {t('markets.useMarket')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field
            id={`lat${sm.farmerMarketId}`}
            label={t('markets.lat')}
            value={s.lat.toFixed(6)}
            onChange={(e) => onUpdate({ lat: Number(e.target.value) || s.lat })}
          />
          <Field
            id={`lng${sm.farmerMarketId}`}
            label={t('markets.lng')}
            value={s.lng.toFixed(6)}
            onChange={(e) => onUpdate({ lng: Number(e.target.value) || s.lng })}
          />
        </div>
      )}
    </Card>
  );
};

export default StallMarketCard;
