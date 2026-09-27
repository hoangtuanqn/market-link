import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import OrderApi, { type OrderGroupPreviewDto } from '@/api-requests/order.requests';
import StallApi, { toSlotOption } from '@/api-requests/stall.requests';
import CartGroup, { type CartLineType } from '@/components/CartGroup';
import DayChips from '@/components/DayChips';
import SlotPicker from '@/components/SlotPicker';
import { Banner } from '@/components/ui/banner';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataState, LoadError } from '@/components/ui/data-state';
import { SelectField } from '@/components/ui/input';
import useRequest from '@/hooks/useRequest';
import useSession from '@/hooks/useSession';
import { Cart, useCart } from '@/lib/cart';
import { dayName, formatClock, formatDayMonth, vnd } from '@/lib/format';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

/** Per stall: chosen market (when the stall sells at several), pickup date, slot, note. */
type Choice = { marketId: number | null; date: string | null; slotId: string | null; note: string };

/** `group.problems` values (order.requests.ts `OrderGroupPreviewDto`) — kept as a union so `t()` accepts the key. */
type ProblemCode = 'out_of_stock' | 'sold_out' | 'unavailable' | 'stall_suspended';

/** `yyyy-MM-dd` → a Date in local time; `new Date('2026-10-03')` is midnight UTC and lands on the previous day at UTC−x. */
const localDay = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
};

type StallPickupProps = { group: OrderGroupPreviewDto; choice: Choice; onChange: (patch: Partial<Choice>) => void };

/** Pickup market/day/slot for one stall's group (FR-032): its own slot request, so groups load independently. */
const StallPickup = ({ group, choice, onChange }: StallPickupProps) => {
  const { t } = useTranslation('CustomerCart');
  const { t: tc } = useTranslation();
  const { state, retry } = useRequest(`slots:${group.farmerId}:${choice.marketId}`, () =>
    choice.marketId ? StallApi.slots(group.farmerId, { marketId: choice.marketId }) : Promise.resolve([]),
  );
  const slots = state.kind === 'ready' ? state.data : [];
  const dates = [...new Set(slots.map((s) => s.slotDate))];
  const date = choice.date ?? dates[0] ?? null;
  const dayOptions = dates.map((d) => {
    const x = localDay(d);
    return { value: d, label: dayName(x.getDay(), 'long'), date: formatDayMonth(x) };
  });
  const daySlots = slots.filter((s) => s.slotDate === date);
  const slotOptions = daySlots
    .map(toSlotOption)
    .map((o) => ({ ...o, time: o.time.split('–').map(formatClock).join('–') }));
  const starts = daySlots.map((s) => s.startTime).sort();
  const ends = daySlots.map((s) => s.endTime).sort();

  return (
    <div className="flex flex-col gap-4">
      {group.markets.length > 1 && (
        <SelectField
          id={`market-${group.farmerId}`}
          label={t('market')}
          options={group.markets.map((m) => ({ value: String(m.marketId), label: m.marketName }))}
          value={choice.marketId != null ? String(choice.marketId) : ''}
          onChange={(e) => onChange({ marketId: Number(e.target.value), date: null, slotId: null })}
        />
      )}
      {state.kind === 'loading' ? (
        <p role="status" className="text-ink-muted text-small">
          {tc('notify.list.loading')}
        </p>
      ) : state.kind === 'error' ? (
        <LoadError noun={t('slotsNoun')} onRetry={retry} />
      ) : slots.length === 0 ? (
        <DataState title={t('noSlots.title')} text={t('noSlots.text')} />
      ) : (
        <>
          <DayChips
            name={`day-${group.farmerId}`}
            legend={t('pickupDayAt', { stall: group.stallName })}
            options={dayOptions}
            value={date ?? ''}
            onChange={(v) => onChange({ date: v, slotId: null })}
          />
          <SlotPicker
            name={`slot-${group.farmerId}`}
            slots={slotOptions}
            value={choice.slotId}
            // Store the day on screen too: the first day shows as picked before the customer taps any day
            onChange={(v) => onChange({ slotId: v, date })}
            legend={t('pickupTime', {
              day: date ? dayName(localDay(date).getDay(), 'long') : '',
              date: date ? formatDayMonth(localDay(date)) : '',
              from: starts[0] ? formatClock(starts[0]) : '',
              to: ends[ends.length - 1] ? formatClock(ends[ends.length - 1]) : '',
            })}
          />
        </>
      )}
    </div>
  );
};

/**
 * FR-030 FR-031 FR-032 — the cart previews against the server, splits into one order per stall (D-01) and places the
 * real orders. Not logged in never reaches this page: it sits behind RequireAuth (App.tsx).
 */
const CustomerCartPage = () => {
  const { t } = useTranslation('CustomerCart');
  const { t: tc } = useTranslation();
  const lines = useCart();
  const navigate = useNavigate();
  const { user } = useSession();
  const previewKey = lines.map((l) => `${l.productId}:${l.qty}`).join(',');
  const { state: previewLoad, retry } = useRequest(`cart-preview:${previewKey}`, () =>
    lines.length && user
      ? OrderApi.preview(lines.map((l) => ({ productId: l.productId, quantity: l.qty })))
      : Promise.resolve([]),
  );
  // A quantity change re-runs the preview. Keep the last answer on screen meanwhile: swapping the whole page for
  // "loading" made it flash and remounted every stall's pickup picker (re-fetching its slots) on each +/- tap.
  const [lastPreview, setLastPreview] = useState<OrderGroupPreviewDto[] | null>(null);
  if (previewLoad.kind === 'ready' && previewLoad.data !== lastPreview) setLastPreview(previewLoad.data);
  const refreshing = previewLoad.kind === 'loading' && lastPreview !== null;
  const groups = previewLoad.kind === 'ready' ? previewLoad.data : (lastPreview ?? []);
  // Quantities follow the cart right away; the server's figures catch up when the preview answers
  const qtyOf = (productId: number, fallback: number) => lines.find((l) => l.productId === productId)?.qty ?? fallback;
  const [choices, setChoices] = useState<Record<number, Choice>>({});
  const choice = (g: OrderGroupPreviewDto): Choice =>
    choices[g.farmerId] ?? {
      marketId: g.marketId ?? g.markets[0]?.marketId ?? null,
      date: null,
      slotId: null,
      note: '',
    };
  const setChoice = (farmerId: number, patch: Partial<Choice>) =>
    setChoices((prev) => ({
      ...prev,
      [farmerId]: { ...choice(groups.find((g) => g.farmerId === farmerId)!), ...prev[farmerId], ...patch },
    }));

  const [note, setNote] = useState('');
  const [placing, setPlacing] = useState(false);
  const place = async () => {
    setPlacing(true);
    try {
      const orders = await OrderApi.place(
        groups.map((g) => {
          const c = choice(g);
          return {
            farmerId: g.farmerId,
            marketId: c.marketId!,
            slotId: Number(c.slotId),
            pickupDate: c.date!,
            items: g.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
            customerNote: c.note || note || undefined,
          };
        }),
      );
      Cart.clear();
      navigate('/orders/placed', { state: { orders } });
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
      retry(); // stock or slot changed under us (409): show the fresh preview, keep the cart
    } finally {
      setPlacing(false);
    }
  };

  if (lines.length === 0) {
    return (
      <DataState
        fill
        title={t('empty.title')}
        text={t('empty.text')}
        action={<ButtonLink to="/products">{t('empty.cta')}</ButtonLink>}
      />
    );
  }

  if (previewLoad.kind === 'loading' && lastPreview === null) {
    return (
      <p role="status" className="text-ink-muted">
        {tc('notify.list.loading')}
      </p>
    );
  }

  if (previewLoad.kind === 'error') {
    // The server could not check the cart (e.g. a product that no longer exists answers 400). Keep the lines in reach
    // so the customer can remove the bad one instead of being stuck on "try again".
    return (
      <div className="flex flex-col gap-4">
        <LoadError noun={t('noun')} onRetry={retry} />
        {lines.length > 0 && (
          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">{t('stuck.title')}</h2>
            <p className="text-small text-ink-muted">{t('stuck.text')}</p>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {lines.map((l) => (
                <li
                  key={l.productId}
                  className="border-line flex items-center justify-between gap-3 border-b pb-2 last:border-b-0"
                >
                  <span className="min-w-0">
                    <b className="block truncate">{l.name}</b>
                    <span className="text-small text-ink-muted">
                      {l.stallName} · {l.qty} {l.unit}
                    </span>
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => Cart.remove(l.productId)}>
                    {tc('actions.remove')}
                  </Button>
                </li>
              ))}
            </ul>
            <div>
              <Button variant="secondary" size="sm" onClick={() => Cart.clear()}>
                {t('stuck.clear')}
              </Button>
            </div>
          </Card>
        )}
      </div>
    );
  }

  const total = groups.reduce((s, g) => s + g.subtotal, 0);
  const ready =
    lines.length > 0 &&
    groups.length > 0 &&
    groups.every((g) => {
      const c = choice(g);
      return c.slotId != null && c.date != null && g.problems.length === 0;
    });
  const blocked = groups.find((g) => {
    const c = choice(g);
    return g.problems.length > 0 || c.slotId == null || c.date == null;
  });

  const marketNameOf = (g: OrderGroupPreviewDto, c: Choice) =>
    g.marketName ?? g.markets.find((m) => m.marketId === c.marketId)?.marketName ?? '';
  const whereOf = (g: OrderGroupPreviewDto) => {
    const c = choice(g);
    const market = marketNameOf(g, c);
    if (!c.date) return market;
    const d = localDay(c.date);
    return market
      ? `${market} · ${dayName(d.getDay())} ${formatDayMonth(d)}`
      : `${dayName(d.getDay())} ${formatDayMonth(d)}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body-lg">
          {t('intro', {
            products: t('products', { count: lines.length }),
            stalls: t('stalls', { count: groups.length }),
          })}
        </p>
      </div>

      {groups.length > 1 && <Banner title={t('split.title', { count: groups.length })}>{t('split.text')}</Banner>}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-8">
          {groups.map((g, i) => {
            const c = choice(g);
            return (
              <section key={g.farmerId} className="flex flex-col gap-3">
                {g.problems.map((p) => (
                  <Banner key={p} variant="warning" title={t(`problem.${p as ProblemCode}`)}>
                    {''}
                  </Banner>
                ))}
                <CartGroup
                  index={i + 1}
                  of={groups.length}
                  stallName={g.stallName}
                  where={whereOf(g)}
                  items={g.items
                    .filter((it) => lines.some((l) => l.productId === it.productId))
                    .map((it): CartLineType => ({
                      id: it.productId,
                      name: it.name,
                      unit: it.unit,
                      price: it.unitPrice,
                      max: it.stockQuantity,
                      qty: qtyOf(it.productId, it.quantity),
                    }))}
                  onQtyChange={(id, qty) => Cart.setQty(id, qty)}
                  onRemove={(id) => Cart.remove(id)}
                />
                {/* Always the same open picker: collapsing it after a pick (or swapping its wrapper) moved the page
                    under the cursor and remounted the slot request. Picking now only highlights the choice. */}
                <Card className="flex flex-col gap-4 p-4">
                  <StallPickup group={g} choice={c} onChange={(patch) => setChoice(g.farmerId, patch)} />
                </Card>
              </section>
            );
          })}
        </div>

        <aside className="sticky top-20 flex flex-col gap-4">
          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">{t('summary.title')}</h2>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
              {groups.map((g, i) => (
                <Fragment key={g.farmerId}>
                  <dt className="text-ink-muted">{t('summary.order', { n: i + 1, stall: g.stallName })}</dt>
                  <dd className="text-price m-0 font-bold tabular-nums">{vnd(g.subtotal)}</dd>
                </Fragment>
              ))}
            </dl>
            <div className="border-line-strong flex items-center justify-between gap-3 border-t-[1.5px] border-dashed pt-3">
              <span className="text-body font-bold">{t('summary.total')}</span>
              <span className="font-hand text-price text-[28px] tabular-nums">{vnd(total)}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="note" className="text-small font-bold">
                {t('note.label')}
              </label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('note.placeholder')}
                className="border-line-strong bg-surface-raised text-body min-h-16 rounded-sm border-[1.5px] p-3"
              />
            </div>
            <Button disabled={!ready || placing || refreshing} className="w-full" onClick={() => void place()}>
              {placing ? t('placing') : t('place', { count: groups.length })}
            </Button>
            <p className="text-small text-ink-muted text-center">
              {ready ? t('ready', { count: groups.length }) : t('notReady', { stall: blocked?.stallName ?? '' })}
            </p>
            <p className="text-ink-muted text-[13px]">{t('stockNote')}</p>
          </Card>
        </aside>
      </div>
    </div>
  );
};

export default CustomerCartPage;
