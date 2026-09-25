import { useState, type Dispatch, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import CartGroup, { type CartLineType } from '@/components/CartGroup';
import DayChips from '@/components/DayChips';
import SlotPicker from '@/components/SlotPicker';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { dayName, formatClock, formatDayMonth, vnd } from '@/lib/format';

type Slot = { value: string; from: string; to: string; booked: number; max: number };

const SLOTS_1: Slot[] = [
  { value: '0600', from: '06:00', to: '06:30', booked: 5, max: 5 },
  { value: '0630', from: '06:30', to: '07:00', booked: 3, max: 5 },
  { value: '0700', from: '07:00', to: '07:30', booked: 1, max: 5 },
  { value: '0730', from: '07:30', to: '08:00', booked: 0, max: 5 },
  { value: '0800', from: '08:00', to: '08:30', booked: 0, max: 5 },
  { value: '0830', from: '08:30', to: '09:00', booked: 2, max: 5 },
];

const SLOTS_2: Slot[] = [
  { value: 'a', from: '06:00', to: '06:30', booked: 5, max: 5 },
  { value: 'b', from: '06:30', to: '07:00', booked: 2, max: 5 },
  { value: 'c', from: '07:00', to: '07:30', booked: 0, max: 5 },
  { value: 'd', from: '07:30', to: '08:00', booked: 4, max: 5 },
  { value: 'e', from: '08:00', to: '08:30', booked: 0, max: 5 },
];

/** The two market mornings this cart can pick up on (Saturday 26/09, Sunday 27/09). */
const DAYS = [
  { value: 'sat', dow: 6, date: new Date(2026, 8, 26) },
  { value: 'sun', dow: 0, date: new Date(2026, 8, 27) },
];

const slotTime = (s: Slot) => `${formatClock(s.from)}–${formatClock(s.to)}`;
const dayOf = (value: string) => DAYS.find((d) => d.value === value) ?? DAYS[0];

type ItemsSetter = Dispatch<SetStateAction<CartLineType[]>>;

/**
 * FR-030 — cart split into one order per Farmer (D-01). The 409 "stock changed" illustration on the prototype is
 * reviewer scaffolding, not real UI, so it is left out here.
 */
const CustomerCartPage = () => {
  const { t } = useTranslation('CustomerCart');
  const navigate = useNavigate();
  const [items1, setItems1] = useState<CartLineType[]>([
    { id: 1, name: 'Củ Chi water spinach', unit: 'bunch', price: 15000, max: 12, qty: 2 },
    { id: 2, name: 'Choy sum', unit: 'bunch', price: 18000, max: 8, qty: 1 },
  ]);
  const [items2, setItems2] = useState<CartLineType[]>([
    { id: 3, name: 'Green-skin pomelo', unit: 'piece', price: 65000, max: 2, qty: 2 },
  ]);
  const [day1, setDay1] = useState('sat');
  const [slot1, setSlot1] = useState<string | null>('0700');
  const [day2, setDay2] = useState('sun');
  const [slot2, setSlot2] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const found1 = SLOTS_1.find((s) => s.value === slot1);
  const found2 = SLOTS_2.find((s) => s.value === slot2);
  const slot1Time = found1 && slotTime(found1);
  const slot2Time = found2 && slotTime(found2);
  const d1 = dayOf(day1);
  const d2 = dayOf(day2);
  const dayOptions = DAYS.map((d) => ({ value: d.value, label: dayName(d.dow), sub: formatDayMonth(d.date) }));
  const slots1 = SLOTS_1.map((s) => ({ ...s, time: slotTime(s) }));
  const slots2 = SLOTS_2.map((s) => ({ ...s, time: slotTime(s) }));

  const total1 = items1.reduce((sum, i) => sum + i.qty * i.price, 0);
  const total2 = items2.reduce((sum, i) => sum + i.qty * i.price, 0);
  const stallCount = [items1.length > 0, items2.length > 0].filter(Boolean).length;
  const ready = Boolean(slot1 && slot2 && items1.length && items2.length);

  const updateQty = (setter: ItemsSetter, id: number, qty: number) => {
    setter((prev) => prev.map((i) => (i.id === id ? { ...i, qty } : i)));
  };
  const removeItem = (setter: ItemsSetter, id: number) => {
    setter((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body-lg">
          {t('intro', {
            products: t('products', { count: items1.length + items2.length }),
            stalls: t('stalls', { count: stallCount }),
          })}
        </p>
      </div>

      <Banner title={t('split.title')}>{t('split.text')}</Banner>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <CartGroup
              index={1}
              of={2}
              stallName="Cô Tư Garden"
              where={`Thảo Điền Weekend Market${slot1Time ? ` · ${dayName(d1.dow)} ${formatDayMonth(d1.date)} · ${slot1Time}` : ''}`}
              items={items1}
              onQtyChange={(id, qty) => updateQty(setItems1, id, qty)}
              onRemove={(id) => removeItem(setItems1, id)}
            />
            <details className="border-line-strong bg-surface-raised shadow-tag rounded-md border-[1.5px] p-4">
              <summary className="text-small cursor-pointer font-bold">
                {t('changeTime', { stall: 'Cô Tư Garden' })}
              </summary>
              <div className="mt-3 flex flex-col gap-4">
                <DayChips name="day1" legend={t('pickupDay')} options={dayOptions} value={day1} onChange={setDay1} />
                <SlotPicker
                  name="slot1"
                  slots={slots1}
                  value={slot1}
                  onChange={setSlot1}
                  legend={t('pickupTime', {
                    day: dayName(d1.dow, 'long'),
                    date: formatDayMonth(d1.date),
                    from: formatClock('06:00'),
                    to: formatClock('10:30'),
                  })}
                />
              </div>
            </details>
          </section>

          <section className="flex flex-col gap-3">
            <CartGroup
              index={2}
              of={2}
              stallName="Út Hiền Orchard"
              where={`Thủ Đức Farmers Market${slot2Time ? ` · ${dayName(d2.dow)} ${formatDayMonth(d2.date)} · ${slot2Time}` : ''}`}
              items={items2}
              onQtyChange={(id, qty) => updateQty(setItems2, id, qty)}
              onRemove={(id) => removeItem(setItems2, id)}
            />
            <Card className="flex flex-col gap-4 p-4">
              <DayChips
                name="day2"
                legend={t('pickupDayAt', { stall: 'Út Hiền Orchard' })}
                options={dayOptions}
                value={day2}
                onChange={setDay2}
              />
              <SlotPicker
                name="slot2"
                slots={slots2}
                value={slot2}
                onChange={setSlot2}
                legend={t('pickupTime', {
                  day: dayName(d2.dow, 'long'),
                  date: formatDayMonth(d2.date),
                  from: formatClock('06:00'),
                  to: formatClock('09:30'),
                })}
              />
              <p className="text-small text-ink-muted">
                {t('cutoffNote', {
                  stall: 'Út Hiền Orchard',
                  hours: 12,
                  slot: formatClock('06:00'),
                  slotDay: dayName(0, 'long'),
                  cutoff: formatClock('18:00'),
                  cutoffDay: dayName(6, 'long'),
                })}
              </p>
            </Card>
          </section>
        </div>

        <aside className="sticky top-20 flex flex-col gap-4">
          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">{t('summary.title')}</h2>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
              <dt className="text-ink-muted">{t('summary.order', { n: 1, stall: 'Cô Tư Garden' })}</dt>
              <dd className="text-price m-0 font-bold tabular-nums">{vnd(total1)}</dd>
              <dt className="text-ink-muted">{t('summary.order', { n: 2, stall: 'Út Hiền Orchard' })}</dt>
              <dd className="text-price m-0 font-bold tabular-nums">{vnd(total2)}</dd>
            </dl>
            <div className="border-line-strong flex items-center justify-between gap-3 border-t-[1.5px] border-dashed pt-3">
              <span className="text-body font-bold">{t('summary.total')}</span>
              <span className="font-hand text-price text-[28px] tabular-nums">{vnd(total1 + total2)}</span>
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
            <Button disabled={!ready} className="w-full" onClick={() => navigate('/orders/placed')}>
              {t('place')}
            </Button>
            <p className="text-small text-ink-muted text-center">
              {ready ? t('ready') : t('notReady', { stall: 'Út Hiền Orchard' })}
            </p>
            <p className="text-ink-muted text-[13px]">{t('stockNote')}</p>
          </Card>
        </aside>
      </div>
    </div>
  );
};

export default CustomerCartPage;
