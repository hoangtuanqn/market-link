import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { dayName, formatClock } from '@/lib/format';
import { formatDistance } from '@/lib/geo';
import type { MarketType } from '@/types/market.types';
import Helper from '@/utils/helper';
import FavoriteButton from './FavoriteButton';
import { ButtonLink } from './ui/button';
import { Card } from './ui/card';
import DirectionsButton from './DirectionsButton';

/** Monday first; names come from `dayName` in the reader's language. */
const WEEK = [1, 2, 3, 4, 5, 6, 0];

type MarketCardProps = {
  market: MarketType;
  /** Real straight-line distance, once the visitor has shared where they are. Overrides the demo figure. */
  distanceKm?: number;
};

const MarketCard = ({ market, distanceKm }: MarketCardProps) => {
  const { t } = useTranslation();
  const href = `/markets/${market.id}`;
  const away = distanceKm != null ? formatDistance(distanceKm) : market.distance;

  return (
    <Card as="article" className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 p-4">
      <div>
        <h3 className="font-hand text-[28px] leading-[1.1]">
          <Link to={href} className="text-inherit no-underline hover:underline hover:underline-offset-3">
            {market.name}
          </Link>
        </h3>
        <p className="text-small text-ink-muted mt-1">{market.address}</p>
      </div>

      <FavoriteButton
        initial={market.saved}
        labelOff={t('marketCard.save', { name: market.name })}
        labelOn={t('marketCard.unsave', { name: market.name })}
        className="self-start"
      />

      <ul aria-label={t('marketCard.days')} className="col-span-full mt-1 grid max-w-md grid-cols-7 gap-1 sm:gap-2">
        {WEEK.map((dow) => {
          const open = market.days.includes(dow);
          return (
            <li
              key={dow}
              className={Helper.cn(
                'rounded-sm py-1.5 text-center text-[13px] font-bold whitespace-nowrap sm:px-1',
                open ? 'bg-brand text-on-brand' : 'bg-surface-sunken text-ink-muted',
              )}
            >
              {dayName(dow)}
              <span className="sr-only"> {open ? t('marketCard.open') : t('marketCard.closed')}</span>
            </li>
          );
        })}
      </ul>

      <p className="text-small text-ink-muted [&_b]:text-ink col-span-full flex flex-wrap gap-4 [&_b]:tabular-nums">
        <span>
          <Trans
            t={t}
            i18nKey="marketCard.hours"
            values={{ open: formatClock(market.open), close: formatClock(market.close) }}
            components={{ b: <b /> }}
          />
        </span>
        <span>
          <Trans t={t} i18nKey="marketCard.stalls" count={market.stalls} components={{ b: <b /> }} />
        </span>
        {away && (
          <span>
            <Trans t={t} i18nKey="marketCard.away" values={{ distance: away }} components={{ b: <b /> }} />
          </span>
        )}
      </p>

      <div className="col-span-full mt-1 flex flex-wrap gap-2">
        <ButtonLink to={href} size="sm">
          {t('marketCard.seeStalls')}
        </ButtonLink>
        <DirectionsButton to={{ lat: market.lat, lng: market.lng }} name={market.name} />
      </div>
    </Card>
  );
};

export default MarketCard;
