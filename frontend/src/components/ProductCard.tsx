import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { PRODUCT_STATUS } from '@/constants/enums';
import { units } from '@/lib/format';
import type { ProductType } from '@/types/product.types';
import Helper from '@/utils/helper';
import FavoriteButton from './FavoriteButton';
import PriceTag from './PriceTag';
import { Button } from './ui/button';
import { Card } from './ui/card';

const LOW_STOCK = 3;

type ProductCardProps = { product: ProductType; showMarket?: boolean };

/** Hang tag with a punched hole: photo area, name, stall, price and stock. */
const ProductCard = ({ product, showMarket = true }: ProductCardProps) => {
  const { t } = useTranslation();
  const paused = product.status === PRODUCT_STATUS.UNAVAILABLE;
  const soldOut = product.status !== PRODUCT_STATUS.AVAILABLE || product.stock === 0;
  const low = !soldOut && product.stock <= LOW_STOCK;
  const qty = units(product.stock, product.unit, product.plural);
  const stock = soldOut
    ? paused
      ? t('product.notThisWeek')
      : t('product.backSoon')
    : low
      ? t('product.onlyLeft', { qty })
      : t('product.left', { qty });
  const href = `/products/${product.id}`;

  return (
    <Card as="article" className="relative flex flex-col overflow-hidden">
      {/* punched hole */}
      <span
        aria-hidden="true"
        className="bg-surface absolute top-2.25 left-1/2 z-1 size-3.5 -translate-x-1/2 rounded-full shadow-[inset_0_0_0_1.5px_var(--line-strong)]"
      />

      <div
        className={Helper.cn(
          'border-line bg-surface-sunken text-ink-muted relative mx-3 mt-7.5 flex aspect-4/3 items-end overflow-hidden rounded-[6px] border p-3',
          soldOut && 'grayscale',
        )}
      >
        <span className="font-hand relative text-[19px] leading-[1.2]">{product.category}</span>
        {(soldOut || product.flag) && (
          <span
            className={Helper.cn(
              'font-hand absolute top-3 left-3 rounded-sm px-2 py-px text-[19px] leading-[1.2]',
              soldOut ? 'bg-ink text-surface-raised' : 'bg-accent text-on-accent',
            )}
          >
            {soldOut ? (paused ? t('product.paused') : t('product.soldOut')) : product.flag}
          </span>
        )}
        <FavoriteButton
          initial={product.favorite}
          labelOff={t('product.addFavorite', { name: product.name })}
          labelOn={t('product.removeFavorite', { name: product.name })}
          className="absolute top-2 right-2"
        />
      </div>

      <div className="flex flex-col gap-2 p-4">
        <h3 className={Helper.cn('text-[17px] leading-tight font-bold', soldOut && 'text-ink-muted')}>
          <Link to={href} className="text-inherit no-underline hover:underline hover:underline-offset-3">
            {product.name}
          </Link>
        </h3>
        <p className="text-small text-ink-muted">
          {product.stall}
          {showMarket && ` · ${product.marketName}`}
        </p>
        <div className="my-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
          <PriceTag amount={product.price} unit={product.unit} was={product.was} />
          <span
            className={Helper.cn(
              'ml-auto text-[13px] whitespace-nowrap',
              low ? 'text-warning-ink font-bold' : 'text-ink-muted',
            )}
          >
            {stock}
          </span>
        </div>
        {soldOut ? (
          <Button variant="secondary" size="sm">
            {t('product.notifyMe')}
          </Button>
        ) : (
          <Button size="sm">{t('product.addToCart')}</Button>
        )}
      </div>
    </Card>
  );
};

export default ProductCard;
