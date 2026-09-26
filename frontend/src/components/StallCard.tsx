import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import Rating from '@/components/Rating';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { marketName } from '@/data/customer';
import DirectionsButton from './DirectionsButton';

type StallCardFarmer = {
  id: number;
  stall: string;
  person: string;
  lat: number | null;
  lng: number | null;
  markets: number[];
  /** Real names, when the caller has them; otherwise the ids are looked up in the demo data (until C11). */
  marketNames?: string[];
  days: string;
  pickup: string;
  rating?: number | null;
  reviews?: number;
  distance?: string;
};

/** Design system `.ml-stall` — a monogram, the stall's markets/days/pickup, and where to find it. */
const StallCard = ({ farmer, children }: { farmer: StallCardFarmer; children?: ReactNode }) => {
  const { t } = useTranslation();
  return (
    <Card as="article" className="grid grid-cols-[56px_1fr] gap-x-4 gap-y-3 p-4">
      <span
        aria-hidden="true"
        className="bg-brand text-on-brand font-hand grid size-14 place-items-center rounded-full text-[28px] uppercase"
      >
        {farmer.stall.trim().charAt(0)}
      </span>
      <div>
        <h3 className="text-[17px] leading-tight font-bold">
          <Link
            to={`/stalls/${farmer.id}`}
            className="text-inherit no-underline hover:underline hover:underline-offset-3"
          >
            {farmer.stall}
          </Link>
        </h3>
        <p className="text-small text-ink-muted mt-0.5">{farmer.person}</p>
        {farmer.rating != null && (
          <div className="mt-1.5">
            <Rating value={farmer.rating} count={farmer.reviews} />
          </div>
        )}
      </div>

      <dl className="text-small col-span-full m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
        <dt className="text-ink-muted">{t('stall.markets')}</dt>
        <dd className="m-0">{(farmer.marketNames ?? farmer.markets.map((id) => marketName(id))).join(', ')}</dd>
        <dt className="text-ink-muted">{t('stall.days')}</dt>
        <dd className="m-0">{farmer.days}</dd>
        <dt className="text-ink-muted">{t('stall.pickup')}</dt>
        <dd className="m-0">{farmer.pickup}</dd>
        {farmer.distance && (
          <>
            <dt className="text-ink-muted">{t('stall.distance')}</dt>
            <dd className="m-0">{farmer.distance}</dd>
          </>
        )}
      </dl>

      {children}

      <div className="col-span-full flex flex-wrap gap-2">
        <ButtonLink to={`/stalls/${farmer.id}`} size="sm">
          {t('stall.see')}
        </ButtonLink>
        {farmer.lat != null && farmer.lng != null && (
          <DirectionsButton to={{ lat: farmer.lat, lng: farmer.lng }} name={farmer.stall} />
        )}
      </div>
    </Card>
  );
};

export default StallCard;
