import { useState } from 'react';
import { Link } from 'react-router';
import DayChips from '@/components/DayChips';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DataState } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { Field, SelectField } from '@/components/ui/input';
import { Table, type TableColumn } from '@/components/ui/table';
import { farmer } from '@/data/catalog';
import Notification from '@/utils/notification';

const f = farmer(1)!;

type Slot = { value: string; time: string; booked: number; max: number; off?: boolean };

const INITIAL_SLOTS: Slot[] = [
  { value: '0600', time: '06:00–06:30', booked: 5, max: 5 },
  { value: '0630', time: '06:30–07:00', booked: 3, max: 5 },
  { value: '0700', time: '07:00–07:30', booked: 1, max: 5 },
  { value: '0730', time: '07:30–08:00', booked: 0, max: 5 },
  { value: '0800', time: '08:00–08:30', booked: 0, max: 5 },
  { value: '0830', time: '08:30–09:00', booked: 2, max: 5 },
  { value: '0900', time: '09:00–09:30', booked: 0, max: 5 },
  { value: '0930', time: '09:30–10:00', booked: 1, max: 5 },
  { value: '1000', time: '10:00–10:30', booked: 0, max: 3, off: true },
];

const DAY_OPTIONS = [
  { value: 'sat', label: 'Sat', sub: '26/09' },
  { value: 'sun', label: 'Sun', sub: '27/09' },
  { value: 'sat2', label: 'Sat', sub: '03/10' },
  { value: 'sun2', label: 'Sun', sub: '04/10', disabled: true },
];

type DayOff = { id: number; marketId: number; date: string; weekday: string; reason: string; orders: number };

const AWAY_OPTIONS = [
  { value: '27/09/2026|Sunday|2', label: 'Sun 27/09 · Thảo Điền · 2 orders placed' },
  { value: '03/10/2026|Saturday|0', label: 'Sat 03/10 · Thảo Điền · no orders yet' },
  { value: '04/10/2026|Sunday|0', label: 'Sun 04/10 · Thảo Điền · market is shut anyway' },
];

/** The one market closure that touches this farmer's markets (04/10 at Thảo Điền, called by the admin). */
const MARKET_CLOSURE = { date: '04/10/2026', reason: 'Ward street works on Quốc Hương' };

/** FR-032 FR-067 — pickup slots for one market day, and the days this stall is not attending. */
const FarmerSlotsPage = () => {
  const [market, setMarket] = useState('Thảo Điền Weekend Market');
  const [day, setDay] = useState('sat');
  const [slots, setSlots] = useState<Slot[]>(INITIAL_SLOTS);
  const [genOpen, setGenOpen] = useState(false);
  const [away, setAway] = useState<DayOff[]>([
    {
      id: 1,
      marketId: 1,
      date: '27/09/2026',
      weekday: 'Sunday',
      reason: 'Harvest was short after the rain',
      orders: 2,
    },
  ]);
  const [awayOpen, setAwayOpen] = useState(false);
  const [awayChoice, setAwayChoice] = useState(AWAY_OPTIONS[0].value);
  const [awayReason, setAwayReason] = useState('');

  const updateSlot = (value: string, patch: Partial<Slot>) =>
    setSlots((prev) => prev.map((s) => (s.value === value ? { ...s, ...patch } : s)));

  const columns: TableColumn<Slot>[] = [
    { key: 't', label: 'Slot', render: (s) => <b className="tabular-nums">{s.time}</b> },
    {
      key: 'b',
      label: 'Booked',
      align: 'num',
      render: (s) => (
        <>
          {s.booked} of {s.max}
          {s.booked >= s.max && <span className="text-ink-muted ml-1 font-normal">Full</span>}
        </>
      ),
    },
    {
      key: 'm',
      label: 'Max orders',
      align: 'num',
      render: (s) => (
        <input
          type="number"
          min={s.booked}
          value={s.max}
          onChange={(e) => updateSlot(s.value, { max: Math.max(s.booked, Number(e.target.value) || s.booked) })}
          aria-label={`Max orders ${s.time}`}
          className="border-line-strong bg-surface-raised min-h-9 w-21 rounded-sm border-[1.5px] px-2 text-right tabular-nums"
        />
      ),
    },
    { key: 'c', label: 'Closes for changes', render: () => '19:00 25/09' },
    {
      key: 'o',
      label: 'Open to new orders',
      render: (s) => (
        <Checkbox
          id={`open-${s.value}`}
          checked={!s.off}
          onChange={(e) => updateSlot(s.value, { off: !e.target.checked })}
        >
          {s.off ? 'Off' : 'On'}
        </Checkbox>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <p className="text-small text-ink-muted">
        <Link to="/farmer/stall" className="text-brand underline">
          Stall &amp; pickup
        </Link>{' '}
        · Pickup slots
      </p>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">Pickup slots</h1>
          <p className="text-body max-w-160">
            Slots are 30-minute windows inside your pickup window. Each slot takes a limited number of orders so nobody
            queues for long. A full slot is greyed out for customers.
          </p>
        </div>
        <Button onClick={() => setGenOpen(true)}>Generate slots for next week</Button>
      </div>

      <div className="flex flex-wrap items-end gap-6">
        <SelectField
          id="mk"
          label="Market"
          value={market}
          onChange={(e) => setMarket(e.target.value)}
          options={['Thảo Điền Weekend Market', 'Thủ Đức Farmers Market']}
        />
        <DayChips legend="Day" name="slot-day" options={DAY_OPTIONS} value={day} onChange={setDay} />
      </div>

      {slots.length ? (
        <Table caption="Saturday 26/09 · Thảo Điền Weekend Market · 9 slots" columns={columns} rows={slots} />
      ) : (
        <DataState
          title="No slots for this day"
          text="Generate the slots for a market day and customers can start booking a pickup time."
        />
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="text-h3">Defaults</h2>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
            <dt className="text-ink-muted">Slot length</dt>
            <dd className="m-0">30 minutes</dd>
            <dt className="text-ink-muted">Orders per slot</dt>
            <dd className="m-0">5 (D-06)</dd>
            <dt className="text-ink-muted">Window at Thảo Điền</dt>
            <dd className="m-0">06:00 – 10:30 on Sat, Sun</dd>
            <dt className="text-ink-muted">Cutoff</dt>
            <dd className="m-0">{f.cutoffHours} hours before the slot</dd>
          </dl>
          <p className="text-small text-ink-muted">
            Change the window and days under Stall &amp; pickup. Slots for a day are created from them.
          </p>
        </Card>
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="text-h3">Closing a slot</h2>
          <p className="text-[15px]">
            Turning a slot off hides it from new orders. Orders already in it stay; contact those customers if you
            cannot make it.
          </p>
        </Card>
      </div>

      <section className="border-line-strong bg-surface-raised shadow-tag flex flex-col gap-4 rounded-md border-[1.5px] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex max-w-160 flex-col gap-2">
            <h2 className="text-h3">Days you are not selling</h2>
            <p className="text-small text-ink-muted">
              A market day you will miss — a short harvest, illness, a van that will not start. Your stall drops off the
              market page for that day and takes no new orders. Orders already placed are declined with your reason, and
              the stock goes back to you (D-02).
            </p>
          </div>
          <Button variant="secondary" onClick={() => setAwayOpen(true)}>
            Tell customers you are away
          </Button>
        </div>

        {away.length ? (
          <Table
            columns={[
              {
                key: 'd',
                label: 'Date',
                render: (d: DayOff) => (
                  <>
                    <b>{d.date}</b>
                    <span className="text-ink-muted mt-0.5 block text-[13px] font-normal">{d.weekday}</span>
                  </>
                ),
              },
              { key: 'm', label: 'Market', render: () => 'Thảo Điền Weekend Market' },
              { key: 'r', label: 'Reason customers see', render: (d: DayOff) => d.reason },
              { key: 'o', label: 'Orders declined', align: 'num', render: (d: DayOff) => d.orders || '—' },
              {
                key: 'a',
                label: '',
                align: 'actions',
                render: (d: DayOff) => (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setAway((prev) => prev.filter((x) => x.id !== d.id));
                      Notification.success({
                        title: 'You are selling again',
                        text: 'You are selling that day again. Declined orders are not brought back; the customer has to order again.',
                      });
                    }}
                  >
                    I can make it
                  </Button>
                ),
              },
            ]}
            rows={away}
          />
        ) : (
          <DataState
            title="You are selling on every market day"
            text="Tell customers in advance if that changes, so nobody turns up to an empty stall."
          />
        )}

        <Banner variant="info" title={`The market itself is shut on ${MARKET_CLOSURE.date}.`}>
          {MARKET_CLOSURE.reason}. You do not need to do anything: nobody can order from any stall for that day, and
          MarketLink has told your customers.
        </Banner>
      </section>

      <Dialog
        open={genOpen}
        title="Generate slots for 03/10 – 04/10?"
        onClose={() => setGenOpen(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setGenOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setGenOpen(false);
                Notification.success({ title: 'Slots created', text: '27 slots created for 03/10 – 04/10.' });
              }}
            >
              Generate 27 slots
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField id="len" label="Slot length" options={['30 minutes', '15 minutes', '60 minutes']} />
            <Field id="mx" label="Orders per slot" inputMode="numeric" defaultValue={5} />
          </div>
          <p className="text-ink-muted text-[14px]">
            Creates slots from 06:00 to 10:30 on Sat and Sun at Thảo Điền and on Sun at Thủ Đức. Existing slots are not
            changed.
          </p>
        </div>
      </Dialog>

      <Dialog
        open={awayOpen}
        title="Tell customers you are away"
        tone="danger"
        onClose={() => setAwayOpen(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setAwayOpen(false)}>
              Not now
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const [date, weekday, ordersStr] = awayChoice.split('|');
                const orders = Number(ordersStr);
                setAway((prev) => [
                  ...prev,
                  { id: Date.now(), marketId: 1, date, weekday, reason: awayReason.trim() || 'Not given', orders },
                ]);
                setAwayOpen(false);
                setAwayReason('');
                Notification.success({
                  title: orders ? 'Orders declined' : 'Customers told',
                  text: orders
                    ? `${orders} orders declined and the customers told.`
                    : `Customers can no longer order from you for ${date}.`,
                });
              }}
            >
              Tell them
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-[15px]">
            Orders already placed for that day are declined with your reason and the stock returns to you. The customer
            is told straight away and pays nothing, because nothing is paid until pickup.
          </p>
          <SelectField
            id="odate"
            label="Market day"
            value={awayChoice}
            onChange={(e) => setAwayChoice(e.target.value)}
            options={AWAY_OPTIONS}
          />
          <Field
            id="oreason"
            label="Reason customers will see"
            placeholder="Harvest was short after the rain"
            value={awayReason}
            onChange={(e) => setAwayReason(e.target.value)}
          />
        </div>
      </Dialog>
    </div>
  );
};

export default FarmerSlotsPage;
