import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { DealDto } from '@/api-requests/deal.requests';
import useAddDeal from '@/hooks/useAddDeal';
import { units } from '@/lib/format';
import Helper from '@/utils/helper';
import PriceTag from './PriceTag';
import { stockDay } from './stockDay';
import { Button } from './ui/button';
import { Card } from './ui/card';

/**
 * FR-125 — one product on a near-expiry deal for one pickup day (spec §4.5.4): both prices, the day, until when it
 * stays good and what is left. Adding it to the cart remembers the day, so the cart starts on it (§4.5.5).
 */
const DealCard = ({ deal }: { deal: DealDto }) => {
  const { t } = useTranslation();
  const addDeal = useAddDeal();
  const day = stockDay(deal.stockDate) ?? deal.stockDate;
  const until = stockDay(deal.bestBefore) ?? deal.bestBefore;

  return (
    <Card as="article" className="flex flex-col overflow-hidden">
      <div className="border-line bg-surface-sunken relative mx-3 mt-3 aspect-4/3 overflow-hidden rounded-sm border">
        {deal.imageUrl && <img src={Helper.mediaUrl(deal.imageUrl)} alt="" className="size-full object-cover" />}
        <span className="font-hand bg-danger text-on-danger absolute top-3 right-3 rounded-sm px-2 py-1 text-[19px] leading-none">
          {t('deal.off', { percent: deal.discountPercent })}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-[17px] leading-tight font-bold">
          <Link
            to={`/products/${deal.productId}`}
            className="text-inherit no-underline hover:underline hover:underline-offset-3"
          >
            {deal.name}
          </Link>
        </h3>
        <p className="text-small text-ink-muted">{[deal.stallName, ...deal.marketNames].join(' · ')}</p>
        <div className="my-1">
          <PriceTag amount={deal.unitPrice} unit={deal.unit} was={deal.listPrice} />
        </div>
        <p className="text-small">
          {t('deal.pickupLine', { day, until, qty: units(deal.quantityAvailable, deal.unit) })}
        </p>
        <Button size="sm" className="mt-auto" onClick={() => addDeal(deal)}>
          {t('product.addToCart')}
        </Button>
      </div>
    </Card>
  );
};

export default DealCard;
