import { useState } from 'react';
import { Link } from 'react-router';
import OrderTicket from '@/components/OrderTicket';
import ProductCard from '@/components/ProductCard';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { dashboardFavoriteProducts, orders } from '@/data/customer';
import useClock from '@/hooks/useClock';
import { formatTime, weekday } from '@/lib/format';

const pad = (n: number) => String(n).padStart(2, '0');

const nextPickups = orders
  .filter((o) => o.status === 'ready' || o.status === 'accepted' || o.status === 'placed')
  .slice(0, 3);

/**
 * FR-010 FR-036 FR-060 — customer dashboard; content is not specified in the SRS beyond "securely access their
 * dashboard".
 */
const CustomerDashboardPage = () => {
  const now = useClock();
  const [showSellCard, setShowSellCard] = useState(true);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="font-hand text-hand text-ink-muted">
            <time dateTime={now.toISOString()}>
              {weekday(now)} {pad(now.getDate())}/{pad(now.getMonth() + 1)} · {formatTime(now)}
            </time>
          </p>
          <h1 className="text-h1">Hi Khang, 3 pickups this weekend</h1>
          <p className="text-body-lg max-w-155">
            One order is still waiting for the stall to confirm. Everything else is on track.
          </p>
        </div>
        <ButtonLink to="/markets">Browse this weekend&apos;s markets</ButtonLink>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card as="article" className="flex flex-col gap-2 p-4">
          <Link to="/orders" className="flex flex-col gap-2 text-inherit no-underline">
            <b className="text-[17px]">4 upcoming orders</b>
            <span className="text-small text-ink-muted">1 waiting for approval · 2 accepted · 1 ready</span>
          </Link>
        </Card>
        <Card as="article" className="flex flex-col gap-2 p-4">
          <Link to="/favorites" className="flex flex-col gap-2 text-inherit no-underline">
            <b className="text-[17px]">8 favorites</b>
            <span className="text-small text-ink-muted">3 stalls · 4 products · 1 market</span>
          </Link>
        </Card>
        <Card as="article" className="flex flex-col gap-2 p-4">
          <Link to="/notifications" className="flex flex-col gap-2 text-inherit no-underline">
            <b className="text-[17px]">2 unread notifications</b>
            <span className="text-small text-ink-muted">An order is ready, and goat yogurt is back</span>
          </Link>
        </Card>
        <Card as="article" className="flex flex-col gap-2 p-4">
          <Link to="/account" className="flex flex-col gap-2 text-inherit no-underline">
            <b className="text-[17px]">Account</b>
            <span className="text-small text-ink-muted">Nguyễn Minh Khang · Thảo Điền</span>
          </Link>
        </Card>
      </div>

      {showSellCard && (
        <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex max-w-140 flex-col gap-2">
            <p className="text-overline text-ink-muted uppercase">New here</p>
            <h2 className="text-h3">Do you grow something? Sell it at the market</h2>
            <p className="text-[15px]">
              Your account can become a stall at one of the four markets. Apply with a few photos of your plot and an
              admin reviews it. You carry on shopping either way.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink to="/become-farmer">Apply to sell</ButtonLink>
            <button
              type="button"
              onClick={() => setShowSellCard(false)}
              className="text-brand min-h-11 cursor-pointer bg-transparent px-2 font-bold underline-offset-4 hover:underline"
            >
              Not now
            </button>
          </div>
        </Card>
      )}

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-h2">Next pickups</h2>
          <Link to="/orders" className="text-brand underline">
            All my orders
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {nextPickups.map((o) => (
            <OrderTicket key={o.code} order={o} fluid />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-h2">New this week from your favorite stalls</h2>
          <Link to="/favorites" className="text-brand underline">
            Favorites
          </Link>
        </div>
        <div className="grid gap-x-4 gap-y-6 md:grid-cols-2 lg:grid-cols-3">
          {dashboardFavoriteProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default CustomerDashboardPage;
