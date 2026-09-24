import { useState, type Dispatch, type SetStateAction } from 'react';
import { useNavigate } from 'react-router';
import CartGroup, { type CartLineType } from '@/components/CartGroup';
import DayChips from '@/components/DayChips';
import SlotPicker from '@/components/SlotPicker';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { vnd } from '@/lib/format';

const SLOTS_1 = [
  { value: '0600', time: '06:00–06:30', booked: 5, max: 5 },
  { value: '0630', time: '06:30–07:00', booked: 3, max: 5 },
  { value: '0700', time: '07:00–07:30', booked: 1, max: 5 },
  { value: '0730', time: '07:30–08:00', booked: 0, max: 5 },
  { value: '0800', time: '08:00–08:30', booked: 0, max: 5 },
  { value: '0830', time: '08:30–09:00', booked: 2, max: 5 },
];

const SLOTS_2 = [
  { value: 'a', time: '06:00–06:30', booked: 5, max: 5 },
  { value: 'b', time: '06:30–07:00', booked: 2, max: 5 },
  { value: 'c', time: '07:00–07:30', booked: 0, max: 5 },
  { value: 'd', time: '07:30–08:00', booked: 4, max: 5 },
  { value: 'e', time: '08:00–08:30', booked: 0, max: 5 },
];

const DAY_OPTIONS = [
  { value: 'sat', label: 'Sat', sub: '26/09' },
  { value: 'sun', label: 'Sun', sub: '27/09' },
];

type ItemsSetter = Dispatch<SetStateAction<CartLineType[]>>;

/**
 * FR-030 — cart split into one order per Farmer (D-01). The 409 "stock changed" illustration on the prototype is
 * reviewer scaffolding, not real UI, so it is left out here.
 */
const CustomerCartPage = () => {
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

  const slot1Time = SLOTS_1.find((s) => s.value === slot1)?.time;
  const slot2Time = SLOTS_2.find((s) => s.value === slot2)?.time;
  const day1Label = DAY_OPTIONS.find((d) => d.value === day1)?.label === 'Sat' ? 'Sat' : 'Sun';
  const day2Label = DAY_OPTIONS.find((d) => d.value === day2)?.label === 'Sat' ? 'Sat' : 'Sun';

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
        <h1 className="text-h1">Cart</h1>
        <p className="text-body-lg">
          {items1.length + items2.length} products from {stallCount} stalls. Pick a pickup time for each stall, then
          place the orders.
        </p>
      </div>

      <Banner title="Your cart will be split into 2 orders at 2 different stalls.">
        Each stall has its own pickup time and cutoff, and accepts its order separately. You pay each stall on pickup.
      </Banner>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <CartGroup
              index={1}
              of={2}
              stallName="Cô Tư Garden"
              where={`Thảo Điền Weekend Market${slot1Time ? ` · ${day1Label} 26/09 · ${slot1Time}` : ''}`}
              items={items1}
              onQtyChange={(id, qty) => updateQty(setItems1, id, qty)}
              onRemove={(id) => removeItem(setItems1, id)}
            />
            <details className="border-line-strong bg-surface-raised shadow-tag rounded-md border-[1.5px] p-4">
              <summary className="text-small cursor-pointer font-bold">Change pickup time at Cô Tư Garden</summary>
              <div className="mt-3 flex flex-col gap-4">
                <DayChips name="day1" legend="Pickup day" options={DAY_OPTIONS} value={day1} onChange={setDay1} />
                <SlotPicker
                  name="slot1"
                  slots={SLOTS_1}
                  value={slot1}
                  onChange={setSlot1}
                  legend={`Pickup time · ${day1Label === 'Sat' ? 'Saturday' : 'Sunday'} 26/09 · window 06:00 – 10:30`}
                />
              </div>
            </details>
          </section>

          <section className="flex flex-col gap-3">
            <CartGroup
              index={2}
              of={2}
              stallName="Út Hiền Orchard"
              where={`Thủ Đức Farmers Market${slot2Time ? ` · ${day2Label} 27/09 · ${slot2Time}` : ''}`}
              items={items2}
              onQtyChange={(id, qty) => updateQty(setItems2, id, qty)}
              onRemove={(id) => removeItem(setItems2, id)}
            />
            <Card className="flex flex-col gap-4 p-4">
              <DayChips
                name="day2"
                legend="Pickup day at Út Hiền Orchard"
                options={DAY_OPTIONS}
                value={day2}
                onChange={setDay2}
              />
              <SlotPicker
                name="slot2"
                slots={SLOTS_2}
                value={slot2}
                onChange={setSlot2}
                legend={`Pickup time · ${day2Label === 'Sat' ? 'Saturday' : 'Sunday'} 27/09 · window 06:00 – 09:30`}
              />
              <p className="text-small text-ink-muted">
                Út Hiền Orchard closes orders 12 hours before the slot. For 06:00 on Sunday that is 18:00 on Saturday.
              </p>
            </Card>
          </section>
        </div>

        <aside className="sticky top-20 flex flex-col gap-4">
          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">Pay at the stalls on pickup</h2>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
              <dt className="text-ink-muted">Order 1 · Cô Tư Garden</dt>
              <dd className="text-price m-0 font-bold tabular-nums">{vnd(total1)}</dd>
              <dt className="text-ink-muted">Order 2 · Út Hiền Orchard</dt>
              <dd className="text-price m-0 font-bold tabular-nums">{vnd(total2)}</dd>
            </dl>
            <div className="border-line-strong flex items-center justify-between gap-3 border-t-[1.5px] border-dashed pt-3">
              <span className="text-body font-bold">Total, both stalls</span>
              <span className="font-hand text-price text-[28px] tabular-nums">{vnd(total1 + total2)}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="note" className="text-small font-bold">
                Note to the stalls
              </label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. smaller bunches please"
                className="border-line-strong bg-surface-raised text-body min-h-16 rounded-sm border-[1.5px] p-3"
              />
            </div>
            <Button disabled={!ready} className="w-full" onClick={() => navigate('/orders/placed')}>
              Place 2 orders
            </Button>
            <p className="text-small text-ink-muted text-center">
              {ready
                ? 'Both stalls have a pickup time. Each stall confirms its own order.'
                : 'Choose a pickup time at Út Hiền Orchard to place your orders.'}
            </p>
            <p className="text-ink-muted text-[13px]">
              Stock is taken out of the stall&apos;s count the moment you place the order. There is no online payment.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
};

export default CustomerCartPage;
