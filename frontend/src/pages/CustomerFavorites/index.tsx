import { useState } from 'react';
import { Link } from 'react-router';
import { CheckIcon, CloseIcon } from '@/components/icons';
import MarketCard from '@/components/MarketCard';
import PriceTag from '@/components/PriceTag';
import StallCard from '@/components/StallCard';
import { Banner } from '@/components/ui/banner';
import { Button, ButtonLink } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import Tabs from '@/components/ui/tabs';
import { farmer, wishProducts, type WishProductItem } from '@/data/customer';
import { markets } from '@/data/home';
import { units } from '@/lib/format';
import Notification from '@/utils/notification';
import Helper from '@/utils/helper';

const NEW_THIS_WEEK: Record<number, string> = {
  1: 'Choy sum and Thai basil are back this Saturday',
  3: 'Goat cheese and milk, no yogurt until Sunday',
  4: 'Rye loaf and sourdough, baked at 5am on Friday',
};

const FILTERS = ['All', 'In stock now', 'Sold out', 'Price dropped'] as const;
type Filter = (typeof FILTERS)[number];

const isSoldOut = (item: WishProductItem) => item.product.status !== 'available' || item.product.stock === 0;

const WishItem = ({ item, onRemove }: { item: WishProductItem; onRemove: () => void }) => {
  const p = item.product;
  const soldOut = isSoldOut(item);

  return (
    <li className="border-line-strong bg-surface-raised shadow-tag grid grid-cols-[72px_minmax(0,1fr)] items-center gap-4 rounded-md border-[1.5px] p-4 md:grid-cols-[96px_minmax(0,1fr)_auto]">
      <span
        className={Helper.cn(
          'border-line bg-surface-sunken text-ink-muted font-hand flex aspect-4/3 w-18 items-center justify-center rounded-[6px] border p-1 text-center text-[15px] md:w-24',
          soldOut && 'grayscale',
        )}
      >
        {p.category}
      </span>
      <div>
        <b className="block text-[17px] leading-tight">
          <Link to={`/products/${p.id}`} className="text-inherit no-underline hover:underline hover:underline-offset-3">
            {p.name}
          </Link>
        </b>
        <p className="text-small text-ink-muted mt-0.5">
          <Link to="/stall" className="text-inherit no-underline hover:underline">
            {p.stall}
          </Link>{' '}
          · {p.marketName}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px]">
          <PriceTag amount={p.price} unit={p.unit} was={p.was} />
          {soldOut ? (
            <span className="bg-status-declined-bg text-status-declined-ink inline-flex items-center gap-1 rounded-full py-0.75 pr-2.5 pl-2 font-bold">
              <CloseIcon size={14} />
              Sold out
            </span>
          ) : (
            <span className="bg-status-ready-bg text-status-ready-ink inline-flex items-center gap-1 rounded-full py-0.75 pr-2.5 pl-2 font-bold">
              <CheckIcon size={14} />
              {units(p.stock, p.unit)} left
            </span>
          )}
          <span className="text-ink-muted">{item.saved}</span>
          {item.note && <span className="text-ink-muted">{item.note}</span>}
        </div>
      </div>
      <div className="col-span-full flex flex-row flex-wrap items-center gap-2 md:col-span-1 md:flex-col md:items-end">
        {soldOut ? (
          <Button
            variant="secondary"
            size="sm"
            aria-pressed="true"
            onClick={() => Notification.success({ title: 'Restock alert', text: `Alert is off for ${p.name}.` })}
          >
            Alert is on
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => Notification.success({ title: 'Added to cart', text: `Added ${p.name} to your cart.` })}
          >
            Add to cart
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onRemove();
            Notification.info({ title: 'Removed', text: `Removed ${p.name} from your favorites.` });
          }}
        >
          Remove
        </Button>
      </div>
    </li>
  );
};

/** FR-014 — wishlist: saved products, stalls and markets. */
const CustomerFavoritesPage = () => {
  const [tab, setTab] = useState<'products' | 'stalls' | 'markets'>('products');
  const [filter, setFilter] = useState<Filter>('All');
  const [items, setItems] = useState(wishProducts);

  const counts: Record<Filter, number> = {
    All: items.length,
    'In stock now': items.filter((i) => !isSoldOut(i)).length,
    'Sold out': items.filter(isSoldOut).length,
    'Price dropped': items.filter((i) => i.product.was != null).length,
  };
  const shown = items.filter((i) => {
    if (filter === 'In stock now') return !isSoldOut(i);
    if (filter === 'Sold out') return isSoldOut(i);
    if (filter === 'Price dropped') return i.product.was != null;
    return true;
  });
  const inStockCount = items.filter((i) => !isSoldOut(i)).length;

  const stallIds = [1, 3, 4];
  const savedMarket = markets.find((m) => m.id === 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">Favorites</h1>
          <p className="text-body-lg max-w-155">
            Your wishlist: products you want next time, stalls you go back to, and the markets you shop at. A sold-out
            favorite tells you when it is back.
          </p>
        </div>
        <ButtonLink to="/products" variant="secondary">
          Find more to save
        </ButtonLink>
      </div>

      <Tabs
        label="Saved things"
        value={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: 'products', label: 'Products', count: items.length },
          { id: 'stalls', label: 'Stalls', count: stallIds.length },
          { id: 'markets', label: 'Markets', count: savedMarket ? 1 : 0 },
        ]}
      />

      {tab === 'products' && (
        <div className="flex flex-col gap-4">
          <Banner title="One of your four saved products is sold out.">
            Restock alerts are on, so you get a notification the moment the stall lists it again.
          </Banner>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <Chip key={f} pressed={filter === f} onClick={() => setFilter(f)}>
                  {f} <span className="text-[12px] tabular-nums opacity-80">{counts[f]}</span>
                </Chip>
              ))}
            </div>
            <Button
              size="sm"
              onClick={() =>
                Notification.success({
                  title: 'Added to cart',
                  text: `Added ${inStockCount} products to your cart. They will be split by stall at checkout.`,
                })
              }
            >
              Add the {inStockCount} in-stock items to cart
            </Button>
          </div>

          <ul className="m-0 flex flex-col gap-3 p-0">
            {shown.map((item) => (
              <WishItem
                key={item.product.id}
                item={item}
                onRemove={() => setItems((prev) => prev.filter((i) => i.product.id !== item.product.id))}
              />
            ))}
          </ul>
          <p className="text-small text-ink-muted">
            Saving a product does not hold any stock. It is held only when you place the order.
          </p>
        </div>
      )}

      {tab === 'stalls' && (
        <div className="flex flex-col gap-4">
          <p className="text-small text-ink-muted">Your saved stalls, with what each one is bringing this weekend.</p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stallIds.map((id) => {
              const f = farmer(id);
              if (!f) return null;
              return (
                <StallCard key={id} farmer={f}>
                  <p className="text-small col-span-full m-0 flex justify-between gap-3">
                    <span className="text-ink-muted">This week</span>
                    <span>{NEW_THIS_WEEK[id]}</span>
                  </p>
                </StallCard>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'markets' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {savedMarket && <MarketCard market={savedMarket} />}
          </div>
          <p className="text-small text-ink-muted">
            A saved market comes first in lists and on the map, and directions to its stalls start from your saved
            address.
          </p>
        </div>
      )}
    </div>
  );
};

export default CustomerFavoritesPage;
