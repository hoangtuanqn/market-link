import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useAssistantCart } from '@/components/assistant/assistantContext';
import AskAssistant from '@/components/assistant/AskAssistant';
import OrderApi, { type OrderGroupPreviewDto } from '@/api-requests/order.requests';
import StallApi, { toSlotOption, type SlotDto } from '@/api-requests/stall.requests';
import CartGroup, { type CartLineType } from '@/components/CartGroup';
import DayChips from '@/components/DayChips';
import SlotPicker from '@/components/SlotPicker';
import { stockDay } from '@/components/stockDay';
import { Banner } from '@/components/ui/banner';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataState, LoadError } from '@/components/ui/data-state';
import { SelectField } from '@/components/ui/input';
import useRequest from '@/hooks/useRequest';
import useSession from '@/hooks/useSession';
import { Cart, useCart, type CartLine } from '@/lib/cart';
import { dayName, formatClock, formatDayMonth, money } from '@/lib/format';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';
import DealNote from './DealNote';
import { NO_CHOICE, pickupOf, todayInHcmc, type Choice, type Pickup } from './pickup';

type StallSlots = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; slots: SlotDto[] };

type ProblemCode = 'out_of_stock' | 'sold_out' | 'unavailable' | 'stall_suspended';

const localDay = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
};

type StallPickupProps = {
  group: OrderGroupPreviewDto;
  slots: StallSlots;
  pickup: Pickup | null;
  choice: Choice;
  onRetry: () => void;
  onChange: (patch: Partial<Choice>) => void;
};

const StallPickup = ({ group, slots, pickup, choice, onRetry, onChange }: StallPickupProps) => {
  const { t } = useTranslation('CustomerCart');
  const { t: tc } = useTranslation();
  const marketId = pickup?.marketId ?? group.marketId ?? group.markets[0]?.marketId ?? null;
  const date = pickup?.shownDay ?? null;
  const dayOptions = (pickup?.days ?? []).map((d) => {
    const x = localDay(d);
    return { value: d, label: dayName(x.getDay(), 'long'), date: formatDayMonth(x) };
  });
  const daySlots = (slots.kind === 'ready' ? slots.slots : [])
    .filter((s) => s.marketId === marketId && s.slotDate === date)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
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
          value={marketId != null ? String(marketId) : ''}
          onChange={(e) => onChange({ marketId: Number(e.target.value), date: null, shown: null, slotId: null })}
        />
      )}
      {slots.kind === 'loading' ? (
        <p role="status" className="text-ink-muted text-small">
          {tc('notify.list.loading')}
        </p>
      ) : slots.kind === 'error' ? (
        <LoadError noun={t('slotsNoun')} onRetry={onRetry} />
      ) : !pickup || pickup.days.length === 0 ? (
        <DataState title={t('noSlots.title')} text={t('noSlots.text')} />
      ) : (
        <>
          {pickup.goneDealDays.map((d) => (
            <p key={d} className="text-small text-warning-ink">
              {t('deal.dayGone', { day: stockDay(d) ?? d })}
            </p>
          ))}
          <DayChips
            name={`day-${group.farmerId}`}
            legend={t('pickupDayAt', { stall: group.stallName })}
            options={dayOptions}
            value={date ?? ''}
            onChange={(v) =>
              onChange(
                pickup.bookable.has(v)
                  ? { marketId, date: v, shown: v, slotId: null }
                  : { marketId, shown: v, slotId: null },
              )
            }
          />
          <SlotPicker
            name={`slot-${group.farmerId}`}
            slots={slotOptions}
            value={choice.slotId}
            onChange={(v) => onChange({ marketId, date, shown: date, slotId: v })}
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

const CustomerCartPage = () => {
  const { t } = useTranslation('CustomerCart');
  const { t: tc } = useTranslation();
  const { t: tAssistant } = useTranslation('common');
  const lines = useCart();
  useAssistantCart(lines.map((l) => ({ productId: l.productId, quantity: l.qty })));
  const navigate = useNavigate();
  const { user } = useSession();
  const [choices, setChoices] = useState<Record<number, Choice>>({});
  const choiceOf = (farmerId: number) => choices[farmerId] ?? NO_CHOICE;
  const setChoice = (farmerId: number, patch: Partial<Choice>) =>
    setChoices((prev) => ({ ...prev, [farmerId]: { ...(prev[farmerId] ?? NO_CHOICE), ...patch } }));

  const today = todayInHcmc();
  const dealDayOfLine = (l: CartLine) => (l.pickupDate && l.pickupDate >= today ? l.pickupDate : null);
  const stalls = [...new Set(lines.map((l) => l.farmerId))];
  const dealDaysOf = (farmerId: number) => [
    ...new Set(lines.flatMap((l) => (l.farmerId === farmerId ? (dealDayOfLine(l) ?? []) : []))),
  ];

  const stallKey = [...stalls].sort((a, b) => a - b).join(',');
  const { state: slotsLoad, retry: retrySlots } = useRequest(`cart-slots:${stallKey}`, () =>
    Promise.all(
      stalls.map((farmerId) =>
        StallApi.slots(farmerId).then(
          (slots): StallSlots => ({ kind: 'ready', slots }),
          (): StallSlots => ({ kind: 'error' }),
        ),
      ),
    ).then((all) => new Map(stalls.map((farmerId, i) => [farmerId, all[i]]))),
  );
  const [lastSlots, setLastSlots] = useState<Map<number, StallSlots> | null>(null);
  if (slotsLoad.kind === 'ready' && slotsLoad.data !== lastSlots) setLastSlots(slotsLoad.data);
  const slotsMap = slotsLoad.kind === 'ready' ? slotsLoad.data : lastSlots;
  const slotsOf = (farmerId: number): StallSlots => {
    const known = slotsMap?.get(farmerId);
    if (known?.kind === 'ready') return known;
    return slotsLoad.kind === 'loading' ? { kind: 'loading' } : (known ?? { kind: 'error' });
  };
  const pickups = new Map(
    stalls.map((farmerId) => {
      const s = slotsOf(farmerId);
      return [farmerId, s.kind === 'ready' ? pickupOf(s.slots, choiceOf(farmerId), dealDaysOf(farmerId)) : null];
    }),
  );

  const pickupDates = stalls.flatMap((farmerId) => {
    const date = pickups.get(farmerId)?.pricedDay;
    return date ? [{ farmerId, date }] : [];
  });
  const slotsIn = slotsMap !== null || slotsLoad.kind === 'error';
  const previewKey = `${lines.map((l) => `${l.productId}:${l.qty}`).join(',')}|${pickupDates
    .map((d) => `${d.farmerId}@${d.date}`)
    .join(',')}`;
  const { state: previewLoad, retry } = useRequest(`cart-preview:${slotsIn ? previewKey : 'waiting'}`, () =>
    !lines.length || !user
      ? Promise.resolve([])
      : slotsIn
        ? OrderApi.preview(
            lines.map((l) => ({ productId: l.productId, quantity: l.qty })),
            pickupDates,
          )
        : Promise.resolve(null),
  );
  const answer = previewLoad.kind === 'ready' ? previewLoad.data : null;
  const [lastPreview, setLastPreview] = useState<OrderGroupPreviewDto[] | null>(null);
  if (answer && answer !== lastPreview) setLastPreview(answer);
  const pending = answer === null && previewLoad.kind !== 'error';
  const refreshing = pending && lastPreview !== null;
  const groups = answer ?? lastPreview ?? [];
  const qtyOf = (productId: number, fallback: number) => lines.find((l) => l.productId === productId)?.qty ?? fallback;
  const slotStillFree = (farmerId: number, slotId: string) => {
    const s = slotsOf(farmerId);
    return s.kind === 'ready' && s.slots.some((x) => String(x.slotId) === slotId && !x.isFull);
  };
  const canPlace = (g: OrderGroupPreviewDto) => {
    const c = choiceOf(g.farmerId);
    return (
      c.slotId != null &&
      c.date != null &&
      c.date === pickups.get(g.farmerId)?.pricedDay &&
      slotStillFree(g.farmerId, c.slotId) &&
      g.problems.length === 0
    );
  };

  const [note, setNote] = useState('');
  const [placing, setPlacing] = useState(false);
  const place = async () => {
    setPlacing(true);
    try {
      const orders = await OrderApi.place(
        groups.map((g) => {
          const c = choiceOf(g.farmerId);
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
      retry();
      retrySlots();
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

  if (pending && lastPreview === null) {
    return (
      <p role="status" className="text-ink-muted">
        {tc('notify.list.loading')}
      </p>
    );
  }

  if (previewLoad.kind === 'error') {
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
  const ready = lines.length > 0 && groups.length > 0 && groups.every(canPlace);
  const blocked = groups.find((g) => !canPlace(g));

  const marketNameOf = (g: OrderGroupPreviewDto) => {
    const marketId = pickups.get(g.farmerId)?.marketId ?? g.marketId ?? g.markets[0]?.marketId;
    return g.markets.find((m) => m.marketId === marketId)?.marketName ?? g.marketName ?? '';
  };
  const whereOf = (g: OrderGroupPreviewDto) => {
    const c = choiceOf(g.farmerId);
    const market = marketNameOf(g);
    if (!c.date) return market;
    const d = localDay(c.date);
    return market
      ? `${market} · ${dayName(d.getDay())} ${formatDayMonth(d)}`
      : `${dayName(d.getDay())} ${formatDayMonth(d)}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-2">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body-lg">
          {t('intro', {
            products: t('products', { count: lines.length }),
            stalls: t('stalls', { count: groups.length }),
          })}
        </p>
        <AskAssistant question={tAssistant('assistant.ask.cart')} />
      </div>

      {groups.length > 1 && <Banner title={t('split.title', { count: groups.length })}>{t('split.text')}</Banner>}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-8">
          {groups.map((g, i) => {
            const pickup = pickups.get(g.farmerId) ?? null;
            const dealDayOf = (productId: number) => {
              const line = lines.find((l) => l.productId === productId);
              const day = line ? dealDayOfLine(line) : null;
              return day && !pickup?.goneDealDays.includes(day) ? day : undefined;
            };
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
                      listPrice: it.listPrice,
                      note: (
                        <DealNote item={it} dealDay={dealDayOf(it.productId)} pricedDay={pickup?.pricedDay ?? null} />
                      ),
                    }))}
                  onQtyChange={(id, qty) => Cart.setQty(id, qty)}
                  onRemove={(id) => Cart.remove(id)}
                />
                <Card className="flex flex-col gap-4 p-4">
                  <StallPickup
                    group={g}
                    slots={slotsOf(g.farmerId)}
                    pickup={pickup}
                    choice={choiceOf(g.farmerId)}
                    onRetry={retrySlots}
                    onChange={(patch) => setChoice(g.farmerId, patch)}
                  />
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
                  <dd className="text-price m-0 font-bold tabular-nums">{money(g.subtotal)}</dd>
                </Fragment>
              ))}
            </dl>
            <div className="border-line-strong flex items-center justify-between gap-3 border-t-[1.5px] border-dashed pt-3">
              <span className="text-body font-bold">{t('summary.total')}</span>
              <span className="font-hand text-price text-[28px] tabular-nums">{money(total)}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="note" className="text-small font-bold">
                {t('note.label')}
              </label>
              <textarea
                id="note"
                value={note}
                maxLength={255}
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
