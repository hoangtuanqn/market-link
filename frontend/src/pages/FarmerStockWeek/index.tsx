import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import Tabs from '@/components/ui/tabs';
import { product } from '@/data/catalog';
import { vnd } from '@/lib/format';
import type { ProductStatus } from '@/types/product.types';
import Notification from '@/utils/notification';

const FARMER_PRODUCT_IDS = [1, 2, 7, 19];
/** Reserved stock per product this week — same figures as the Overview "Stock for Saturday" panel. */
const RESERVED: Record<number, number> = { 1: 8, 2: 7, 7: 10, 19: 3 };

type WeekRow = { productId: number; status: ProductStatus; sat: number; sunThaoDien: number; sunThuDuc: number };
type TemplateRow = { productId: number; price: number; sat: number; sun: number };

function initialWeekRows(): WeekRow[] {
  return FARMER_PRODUCT_IDS.map((id) => {
    const p = product(id)!;
    const total = p.stock + (RESERVED[id] ?? 0);
    return {
      productId: id,
      status: p.status,
      sat: total,
      sunThaoDien: Math.round(total * 0.7),
      sunThuDuc: Math.round(total * 0.4),
    };
  });
}

function initialTemplateRows(): TemplateRow[] {
  return FARMER_PRODUCT_IDS.map((id) => {
    const p = product(id)!;
    const total = p.stock + (RESERVED[id] ?? 0);
    return { productId: id, price: p.price, sat: total, sun: Math.round(total * 0.7) };
  });
}

const NumberInput = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
  <input
    type="number"
    min={0}
    value={value}
    onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
    aria-label={label}
    className="border-line-strong bg-surface-raised min-h-9 w-21 rounded-sm border-[1.5px] px-2 text-right text-[14px] tabular-nums"
  />
);

const OffCell = () => (
  <td className="bg-surface-quiet text-ink-muted px-2.5 py-2 text-center" aria-hidden="true">
    —
  </td>
);

const STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'sold_out', label: 'Sold out' },
  { value: 'unavailable', label: 'Paused this week' },
];

const th =
  'bg-surface-sunken text-ink-muted px-2.5 py-2 text-left text-[12px] font-bold tracking-[0.08em] whitespace-nowrap uppercase';
const td = 'border-line border-t px-2.5 py-2 align-middle';

/** FR-063 FR-064 — this week's stock per product and market day, and the weekly template it starts from. */
const FarmerStockWeekPage = () => {
  const [tab, setTab] = useState<'week' | 'tpl'>('week');
  const [rows, setRows] = useState<WeekRow[]>(initialWeekRows);
  const [templateRows, setTemplateRows] = useState<TemplateRow[]>(initialTemplateRows);
  const [applyOpen, setApplyOpen] = useState(false);

  const updateRow = (id: number, patch: Partial<WeekRow>) =>
    setRows((prev) => prev.map((r) => (r.productId === id ? { ...r, ...patch } : r)));
  const updateTemplateRow = (id: number, patch: Partial<TemplateRow>) =>
    setTemplateRows((prev) => prev.map((r) => (r.productId === id ? { ...r, ...patch } : r)));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-overline text-ink-muted m-0">Week of 22/09 – 28/09 · Thảo Điền Fri–Sun · Thủ Đức Sun</p>
          <h1 className="text-h1">This week&apos;s stock</h1>
          <p className="text-body max-w-160">
            Your weekly template is the starting count for each market day. Apply it, then adjust the days where the
            harvest is different. Reserved stock is already taken out of what customers see.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setApplyOpen(true)}>
            Apply template to this week
          </Button>
          <Button
            onClick={() =>
              Notification.success({
                title: 'Saved',
                text: "This week's stock saved. Customers see the new counts now.",
              })
            }
          >
            Save changes
          </Button>
        </div>
      </div>

      <Tabs
        label="Stock views"
        value={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: 'week', label: 'This week' },
          { id: 'tpl', label: 'Weekly template' },
        ]}
      />

      {tab === 'week' && (
        <div className="flex flex-col gap-3">
          <Card className="overflow-x-auto">
            <table className="w-full border-collapse text-[14px]">
              <caption className="sr-only">Stock per product and market day this week</caption>
              <thead>
                <tr>
                  <th className={th}>Product</th>
                  <th className={th}>Status</th>
                  <th className={th}>Price</th>
                  <th className={th}>
                    Fri 25/09
                    <br />
                    Thảo Điền
                  </th>
                  <th className={th}>
                    Sat 26/09
                    <br />
                    Thảo Điền
                  </th>
                  <th className={th}>
                    Sun 27/09
                    <br />
                    Thảo Điền
                  </th>
                  <th className={th}>
                    Sun 27/09
                    <br />
                    Thủ Đức
                  </th>
                  <th className={`${th} text-right`}>Reserved</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const p = product(r.productId)!;
                  return (
                    <tr key={r.productId}>
                      <td className={td}>
                        <b>{p.name}</b>
                        <span className="text-ink-muted mt-0.5 block text-[12px] font-normal">
                          {p.category} · per {p.unit}
                        </span>
                      </td>
                      <td className={td}>
                        <select
                          value={r.status}
                          onChange={(e) => updateRow(r.productId, { status: e.target.value as ProductStatus })}
                          aria-label={`Status of ${p.name}`}
                          className="border-line-strong bg-surface-raised min-h-9 rounded-sm border-[1.5px] px-2 text-[14px]"
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={`${td} tabular-nums`}>{vnd(p.price)}</td>
                      <OffCell />
                      <td className={td}>
                        <NumberInput
                          value={r.sat}
                          onChange={(v) => updateRow(r.productId, { sat: v })}
                          label={`${p.name} Saturday`}
                        />
                      </td>
                      <td className={td}>
                        <NumberInput
                          value={r.sunThaoDien}
                          onChange={(v) => updateRow(r.productId, { sunThaoDien: v })}
                          label={`${p.name} Sunday`}
                        />
                      </td>
                      <td className={td}>
                        <NumberInput
                          value={r.sunThuDuc}
                          onChange={(v) => updateRow(r.productId, { sunThuDuc: v })}
                          label={`${p.name} Sunday Thủ Đức`}
                        />
                      </td>
                      <td className={`${td} text-right font-bold tabular-nums`}>{RESERVED[r.productId] ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
          <p className="text-small text-ink-muted">
            Counts are units available for that day. A blank day means the product is not offered. Fridays are greyed
            because Cô Tư Garden does not sell on Friday.
          </p>
        </div>
      )}

      {tab === 'tpl' && (
        <div className="flex flex-col gap-3">
          <Card className="overflow-x-auto">
            <table className="w-full border-collapse text-[14px]">
              <caption className="sr-only">Weekly template</caption>
              <thead>
                <tr>
                  <th className={th}>Product</th>
                  <th className={th}>Default price</th>
                  <th className={th}>Mon</th>
                  <th className={th}>Tue</th>
                  <th className={th}>Wed</th>
                  <th className={th}>Thu</th>
                  <th className={th}>Fri</th>
                  <th className={th}>Sat</th>
                  <th className={th}>Sun</th>
                </tr>
              </thead>
              <tbody>
                {templateRows.map((r) => {
                  const p = product(r.productId)!;
                  return (
                    <tr key={r.productId}>
                      <td className={td}>
                        <b>{p.name}</b>
                        <span className="text-ink-muted mt-0.5 block text-[12px] font-normal">per {p.unit}</span>
                      </td>
                      <td className={td}>
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={r.price}
                          onChange={(e) =>
                            updateTemplateRow(r.productId, { price: Math.max(0, Number(e.target.value)) })
                          }
                          aria-label={`${p.name} price`}
                          className="border-line-strong bg-surface-raised min-h-9 w-27.5 rounded-sm border-[1.5px] px-2 text-right text-[14px] tabular-nums"
                        />
                      </td>
                      <OffCell />
                      <OffCell />
                      <OffCell />
                      <OffCell />
                      <OffCell />
                      <td className={td}>
                        <NumberInput
                          value={r.sat}
                          onChange={(v) => updateTemplateRow(r.productId, { sat: v })}
                          label={`${p.name} template Saturday`}
                        />
                      </td>
                      <td className={td}>
                        <NumberInput
                          value={r.sun}
                          onChange={(v) => updateTemplateRow(r.productId, { sun: v })}
                          label={`${p.name} template Sunday`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() =>
                Notification.success({
                  title: 'Saved',
                  text: 'Template saved. It applies from next week unless you apply it now.',
                })
              }
            >
              Save template
            </Button>
            <span className="text-small text-ink-muted">
              Template days follow your operating days. Change those under Stall &amp; pickup.
            </span>
          </div>
        </div>
      )}

      <Dialog
        open={applyOpen}
        title="Apply the template to this week?"
        onClose={() => setApplyOpen(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setApplyOpen(false)}>
              Keep my edits
            </Button>
            <Button
              onClick={() => {
                setApplyOpen(false);
                Notification.success({
                  title: 'Template applied',
                  text: 'Template applied to Sat 26/09 and Sun 27/09.',
                });
              }}
            >
              Apply template
            </Button>
          </>
        }
      >
        <p>
          Saturday and Sunday counts are replaced with the template values. Reserved stock is kept out of the
          customer-facing count.
        </p>
        <p className="text-ink-muted text-[14px]">Edits you made for this week are overwritten.</p>
      </Dialog>
    </div>
  );
};

export default FarmerStockWeekPage;
