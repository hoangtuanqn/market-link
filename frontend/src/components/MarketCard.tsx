import { Link } from 'react-router';
import { formatDistance } from '@/lib/geo';
import type { MarketType } from '@/types/market.types';
import Helper from '@/utils/helper';
import FavoriteButton from './FavoriteButton';
import { ButtonLink } from './ui/button';
import { Card } from './ui/card';
import DirectionsButton from './DirectionsButton';

const WEEK: [string, number][] = [
  ['Mon', 1],
  ['Tue', 2],
  ['Wed', 3],
  ['Thu', 4],
  ['Fri', 5],
  ['Sat', 6],
  ['Sun', 0],
];

type MarketCardProps = {
  market: MarketType;
  /** Real straight-line distance, once the visitor has shared where they are. Overrides the demo figure. */
  distanceKm?: number;
};

const MarketCard = ({ market, distanceKm }: MarketCardProps) => {
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
        labelOff={`Save ${market.name}`}
        labelOn={`Unsave ${market.name}`}
        className="self-start"
      />

      <ul aria-label="Market days" className="col-span-full mt-1 flex flex-wrap gap-1">
        {WEEK.map(([label, dow]) => {
          const open = market.days.includes(dow);
          return (
            <li
              key={label}
              className={Helper.cn(
                'min-w-8.5 rounded-sm py-0.75 text-center text-[13px] font-bold',
                open ? 'bg-brand text-on-brand' : 'bg-surface-sunken text-ink-muted',
              )}
            >
              {label}
              <span className="sr-only">{open ? ' open' : ' closed'}</span>
            </li>
          );
        })}
      </ul>

      <p className="text-small text-ink-muted [&_b]:text-ink col-span-full flex flex-wrap gap-4 [&_b]:tabular-nums">
        <span>
          Hours{' '}
          <b>
            {market.open}–{market.close}
          </b>
        </span>
        <span>
          <b>{market.stalls}</b> stalls
        </span>
        {away && (
          <span>
            <b>{away}</b> away
          </span>
        )}
      </p>

      <div className="col-span-full mt-1 flex flex-wrap gap-2">
        <ButtonLink to={href} size="sm">
          See stalls
        </ButtonLink>
        <DirectionsButton to={{ lat: market.lat, lng: market.lng }} name={market.name} />
      </div>
    </Card>
  );
};

export default MarketCard;
