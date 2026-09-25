import { useState } from 'react';
import { CheckIcon } from '@/components/icons';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, type TableColumn } from '@/components/ui/table';
import { product } from '@/data/catalog';
import { vnd } from '@/lib/format';
import Notification from '@/utils/notification';

const PIN_PRODUCT_IDS = [1, 2, 7, 19];

const PRICING = {
  free: { listingsPerDay: 5, bumpsPerMonth: 10 },
  extras: [
    { key: 'listing', name: 'One listing past the daily five', price: 2000 },
    { key: 'bump', name: 'One bump past the monthly ten', price: 3000 },
  ],
  pins: [
    {
      key: 'market',
      name: 'Top of one market page',
      slots: 3,
      note: 'Seen by everyone browsing that market',
      days: [
        [1, 15000],
        [3, 35000],
        [7, 70000],
      ] as [number, number][],
    },
    {
      key: 'home',
      name: 'Home page, all four markets',
      slots: 2,
      note: 'The scarcest slot on MarketLink',
      days: [
        [1, 40000],
        [3, 100000],
        [7, 200000],
      ] as [number, number][],
    },
  ],
  bundles: [
    {
      name: 'Starter',
      price: 50000,
      lines: ['30 listings past the daily limit', '10 extra bumps', 'Runs for 30 days'],
    },
    {
      name: 'Market',
      price: 150000,
      best: true,
      lines: [
        '100 listings past the daily limit',
        '40 extra bumps',
        '2 days pinned on a market page',
        'Runs for 30 days',
      ],
    },
    {
      name: 'Season',
      price: 400000,
      lines: ['No daily listing limit', '120 bumps', '7 days pinned on a market page', 'Runs for 30 days'],
    },
  ],
};

/** What Cô Tư Garden has used this period. */
const ALLOWANCE = {
  listingsUsed: 3,
  bumpsUsed: 7,
  credits: 24000,
  pins: [
    { productId: 1, where: 'Thảo Điền Weekend Market', until: 'Sat 26/09 · 23:59', spent: 35000, views: 412, added: 9 },
  ],
};

type ActivePin = (typeof ALLOWANCE.pins)[number];

const Meter = ({ used, total, unit }: { used: number; total: number; unit: string }) => {
  const pct = Math.min(100, Math.round((used / total) * 100));
  const level = pct >= 100 ? 'full' : pct >= 70 ? 'warn' : 'ok';
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-3">
        <b className="font-hand text-[48px] leading-none tabular-nums">{total - used}</b>
        <span className="text-small text-ink-muted">
          of {total} {unit} left
        </span>
      </div>
      <div className="bg-surface-sunken relative h-2.5 overflow-hidden rounded-full shadow-[inset_0_0_0_1px_var(--line)]">
        <span
          className={
            level === 'ok'
              ? 'bg-brand absolute inset-y-0 left-0 rounded-full'
              : level === 'warn'
                ? 'bg-warning-ink absolute inset-y-0 left-0 rounded-full'
                : 'bg-danger absolute inset-y-0 left-0 rounded-full'
          }
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-ink-muted text-[13px]">
        {used} used{pct >= 70 ? ' · running low' : ''}
      </span>
    </div>
  );
};

const PinCard = ({ pin }: { pin: (typeof PRICING.pins)[number] }) => {
  const [dayIndex, setDayIndex] = useState(1);
  const [productId, setProductId] = useState(PIN_PRODUCT_IDS[0]);
  const price = pin.days[dayIndex][1];

  return (
    <Card className="flex flex-col gap-3 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-h3">{pin.name}</h3>
        <span className="text-small text-ink-muted">{pin.slots} slots</span>
      </div>
      <p className="text-small text-ink-muted">{pin.note}</p>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`p-${pin.key}`} className="text-small font-bold">
          Which product
        </label>
        <select
          id={`p-${pin.key}`}
          value={productId}
          onChange={(e) => setProductId(Number(e.target.value))}
          className="border-line-strong bg-surface-raised min-h-11 rounded-sm border-[1.5px] px-3"
        >
          {PIN_PRODUCT_IDS.map((id) => (
            <option key={id} value={id}>
              {product(id)?.name}
            </option>
          ))}
        </select>
      </div>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="text-small mb-1 p-0 font-bold">How long</legend>
        <div className="flex flex-wrap gap-2">
          {pin.days.map(([days, cost], i) => (
            <label key={days} className="relative">
              <input
                type="radio"
                name={`d-${pin.key}`}
                checked={dayIndex === i}
                onChange={() => setDayIndex(i)}
                className="peer absolute inset-0 m-0 cursor-pointer opacity-0"
              />
              <span className="border-line-strong bg-surface-raised peer-checked:bg-brand peer-checked:text-on-brand peer-focus-visible:outline-focus flex min-h-14 min-w-20 flex-col items-center justify-center gap-0.5 rounded-sm px-3 py-1.5 text-[14px] leading-tight font-bold shadow-[inset_0_0_0_1.5px_var(--line-strong)] peer-checked:shadow-none peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2">
                {days} {days > 1 ? 'days' : 'day'}
                <small className="font-normal text-inherit opacity-80">{vnd(cost)}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Button
        onClick={() =>
          Notification.success({
            title: 'Pinned',
            text: 'Pinned. It goes live within a few minutes and you can stop it at any time.',
          })
        }
      >
        Pin for {vnd(price)}
      </Button>
    </Card>
  );
};

/** Proposal, not in the SRS — paid promotion and listing allowance (see the warning banner below). */
const FarmerPromotePage = () => {
  const activeColumns: TableColumn<ActivePin>[] = [
    {
      key: 'p',
      label: 'Product',
      render: (r) => (
        <>
          <b>{product(r.productId)?.name}</b>
          <span className="text-ink-muted mt-0.5 block text-[13px] font-normal">{r.where}</span>
        </>
      ),
    },
    { key: 'u', label: 'Runs until', render: (r) => r.until },
    { key: 'v', label: 'Views while pinned', align: 'num', render: (r) => r.views.toLocaleString('en-US') },
    { key: 'a', label: 'Added to a cart', align: 'num', render: (r) => r.added },
    { key: 's', label: 'Paid', align: 'num', render: (r) => vnd(r.spent) },
    {
      key: 'x',
      label: '',
      align: 'actions',
      render: () => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => Notification.success({ title: 'Extended', text: 'Extended by 3 days for 35,000 ₫.' })}
        >
          Extend
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">Promote &amp; listings</h1>
          <p className="text-body max-w-160">
            Listing and selling are free. Paying only moves a product further up a page, or lets you list more in a day
            than the free allowance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-status-ready-bg text-status-ready-ink inline-flex items-center gap-1.5 rounded-full py-1 pr-3 pl-2.5 text-[13px] font-bold">
            <CheckIcon size={14} />
            Credit {vnd(ALLOWANCE.credits)}
          </span>
          <Button
            variant="secondary"
            onClick={() =>
              Notification.success({
                title: 'Top up requested',
                text: 'Top-up is arranged with the MarketLink team, then credited here.',
              })
            }
          >
            Top up credit
          </Button>
        </div>
      </div>

      <Banner variant="warning" title="Charging Farmers is not in the SRS.">
        The SRS rules out a payment gateway, so credit here is arranged with the team and entered by an admin. A new
        requirement and a decision on how money is actually taken have to come first.
      </Banner>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="text-h3">Listings today</h2>
          <Meter used={ALLOWANCE.listingsUsed} total={PRICING.free.listingsPerDay} unit="free listings" />
          <p className="text-small text-ink-muted">
            The allowance resets at midnight. Editing a product you already listed is always free.
          </p>
        </Card>
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="text-h3">Bumps this month</h2>
          <Meter used={ALLOWANCE.bumpsUsed} total={PRICING.free.bumpsPerMonth} unit="free bumps" />
          <p className="text-small text-ink-muted">
            A bump moves a product back to the top of its category for the day. It does not change the price or the
            stock.
          </p>
        </Card>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-h2">Pinned right now</h2>
          <span className="text-small text-ink-muted">A pinned product sits above the rest, marked Promoted</span>
        </div>
        <Table columns={activeColumns} rows={ALLOWANCE.pins} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-h2">Pin a product</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {PRICING.pins.map((pin) => (
            <PinCard key={pin.key} pin={pin} />
          ))}
        </div>
        <p className="text-small text-ink-muted">
          Slots are limited on purpose: three on a market page, two on the home page. When they are taken you go on a
          waiting list rather than outbidding anyone.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-h2">Bundles</h2>
        <p className="text-small text-ink-muted -mt-2">Cheaper than buying one at a time, and they run for 30 days.</p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {PRICING.bundles.map((b) => (
            <Card
              key={b.name}
              className={
                b.best ? 'flex flex-col gap-2 p-4 shadow-[inset_0_0_0_2px_var(--brand)]' : 'flex flex-col gap-2 p-4'
              }
            >
              <h3 className="m-0 text-[17px] font-bold">{b.name}</h3>
              <span className="font-hand text-[34px] leading-[1.05]">{vnd(b.price)}</span>
              <ul className="m-0 flex flex-col gap-1.5 p-0 text-[14px]">
                {b.lines.map((l) => (
                  <li key={l} className="flex items-start gap-2">
                    <CheckIcon size={16} className="text-brand mt-0.75 flex-none" />
                    {l}
                  </li>
                ))}
              </ul>
              <Button
                variant={b.best ? 'primary' : 'secondary'}
                className="mt-auto"
                onClick={() =>
                  Notification.success({
                    title: 'Bundle added',
                    text: `${b.name} added. The team will confirm the payment and credit it here.`,
                  })
                }
              >
                Choose {b.name}
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-h2">One at a time</h2>
        <Table
          columns={[
            { key: 'n', label: 'What', render: (r: (typeof PRICING.extras)[number]) => r.name },
            { key: 'p', label: 'Price', align: 'num', render: (r) => vnd(r.price) },
            {
              key: 'a',
              label: '',
              align: 'actions',
              render: () => (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => Notification.success({ title: 'Added', text: 'Added to your credit.' })}
                >
                  Buy
                </Button>
              ),
            },
          ]}
          rows={PRICING.extras}
        />
      </section>
    </div>
  );
};

export default FarmerPromotePage;
