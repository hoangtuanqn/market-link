import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import Tabs from '@/components/ui/tabs';
import { farmer, product } from '@/data/catalog';
import { dayName, formatDayMonth, unitName, vnd, weekday } from '@/lib/format';
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

const STATUS_OPTIONS = [
  { value: 'available', label: 'status.available' },
  { value: 'sold_out', label: 'status.soldOut' },
  { value: 'unavailable', label: 'status.paused' },
] as const satisfies readonly { value: ProductStatus; label: string }[];

const FRI = new Date(2026, 8, 25);
const SAT = new Date(2026, 8, 26);
const SUN = new Date(2026, 8, 27);
/** Monday first, like the template table. */
const WEEK = [1, 2, 3, 4, 5, 6, 0];

const th =
  'bg-surface-sunken text-ink-muted px-2.5 py-2 text-left text-[12px] font-bold tracking-[0.08em] whitespace-nowrap uppercase';
const td = 'border-line border-t px-2.5 py-2 align-middle';

/** FR-063 FR-064 — this week's stock per product and market day, and the weekly template it starts from. */
const FarmerStockWeekPage = () => {
  const { t } = useTranslation('FarmerStockWeek');
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
          <p className="text-overline text-ink-muted m-0">
            {t('overline', {
              from: formatDayMonth(new Date(2026, 8, 22)),
              to: formatDayMonth(new Date(2026, 8, 28)),
              daysA: `${dayName(5)}–${dayName(0)}`,
              daysB: dayName(0),
            })}
          </p>
          <h1 className="text-h1">{t('title')}</h1>
          <p className="text-body max-w-160">{t('intro')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setApplyOpen(true)}>
            {t('apply.open')}
          </Button>
          <Button
            onClick={() =>
              Notification.success({
                title: t('saved'),
                text: t('week.savedText'),
              })
            }
          >
            {t('week.save')}
          </Button>
        </div>
      </div>

      <Tabs
        label={t('tabs.label')}
        value={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: 'week', label: t('tabs.week') },
          { id: 'tpl', label: t('tabs.template') },
        ]}
      />

      {tab === 'week' && (
        <div className="flex flex-col gap-3">
          <Card className="overflow-x-auto">
            <table className="w-full border-collapse text-[14px]">
              <caption className="sr-only">{t('week.caption')}</caption>
              <thead>
                <tr>
                  <th className={th}>{t('col.product')}</th>
                  <th className={th}>{t('col.status')}</th>
                  <th className={th}>{t('col.price')}</th>
                  {(
                    [
                      [FRI, 'Thảo Điền'],
                      [SAT, 'Thảo Điền'],
                      [SUN, 'Thảo Điền'],
                      [SUN, 'Thủ Đức'],
                    ] as const
                  ).map(([date, market]) => (
                    <th key={`${date.getDay()}${market}`} className={th}>
                      {weekday(date)} {formatDayMonth(date)}
                      <br />
                      {market}
                    </th>
                  ))}
                  <th className={`${th} text-right`}>{t('col.reserved')}</th>
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
                          {p.category} · {t('per', { unit: unitName(p.unit) })}
                        </span>
                      </td>
                      <td className={td}>
                        <select
                          value={r.status}
                          onChange={(e) => updateRow(r.productId, { status: e.target.value as ProductStatus })}
                          aria-label={t('aria.status', { product: p.name })}
                          className="border-line-strong bg-surface-raised min-h-9 rounded-sm border-[1.5px] px-2 text-[14px]"
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {t(o.label)}
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
                          label={t('aria.day', { product: p.name, day: dayName(6, 'long') })}
                        />
                      </td>
                      <td className={td}>
                        <NumberInput
                          value={r.sunThaoDien}
                          onChange={(v) => updateRow(r.productId, { sunThaoDien: v })}
                          label={t('aria.day', { product: p.name, day: dayName(0, 'long') })}
                        />
                      </td>
                      <td className={td}>
                        <NumberInput
                          value={r.sunThuDuc}
                          onChange={(v) => updateRow(r.productId, { sunThuDuc: v })}
                          label={t('aria.dayAt', { product: p.name, day: dayName(0, 'long'), market: 'Thủ Đức' })}
                        />
                      </td>
                      <td className={`${td} text-right font-bold tabular-nums`}>{RESERVED[r.productId] ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
          <p className="text-small text-ink-muted">{t('week.note', { stall: farmer(1)?.stall })}</p>
        </div>
      )}

      {tab === 'tpl' && (
        <div className="flex flex-col gap-3">
          <Card className="overflow-x-auto">
            <table className="w-full border-collapse text-[14px]">
              <caption className="sr-only">{t('tabs.template')}</caption>
              <thead>
                <tr>
                  <th className={th}>{t('col.product')}</th>
                  <th className={th}>{t('col.defaultPrice')}</th>
                  {WEEK.map((d) => (
                    <th key={d} className={th}>
                      {dayName(d)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {templateRows.map((r) => {
                  const p = product(r.productId)!;
                  return (
                    <tr key={r.productId}>
                      <td className={td}>
                        <b>{p.name}</b>
                        <span className="text-ink-muted mt-0.5 block text-[12px] font-normal">
                          {t('per', { unit: unitName(p.unit) })}
                        </span>
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
                          aria-label={t('aria.price', { product: p.name })}
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
                          label={t('aria.templateDay', { product: p.name, day: dayName(6, 'long') })}
                        />
                      </td>
                      <td className={td}>
                        <NumberInput
                          value={r.sun}
                          onChange={(v) => updateTemplateRow(r.productId, { sun: v })}
                          label={t('aria.templateDay', { product: p.name, day: dayName(0, 'long') })}
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
                  title: t('saved'),
                  text: t('template.savedText'),
                })
              }
            >
              {t('template.save')}
            </Button>
            <span className="text-small text-ink-muted">{t('template.note')}</span>
          </div>
        </div>
      )}

      <Dialog
        open={applyOpen}
        title={t('apply.title')}
        onClose={() => setApplyOpen(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setApplyOpen(false)}>
              {t('apply.keep')}
            </Button>
            <Button
              onClick={() => {
                setApplyOpen(false);
                Notification.success({
                  title: t('apply.doneTitle'),
                  text: t('apply.doneText', {
                    sat: `${weekday(SAT)} ${formatDayMonth(SAT)}`,
                    sun: `${weekday(SUN)} ${formatDayMonth(SUN)}`,
                  }),
                });
              }}
            >
              {t('apply.confirm')}
            </Button>
          </>
        }
      >
        <p>{t('apply.text', { sat: dayName(6, 'long'), sun: dayName(0, 'long') })}</p>
        <p className="text-ink-muted text-[14px]">{t('apply.warning')}</p>
      </Dialog>
    </div>
  );
};

export default FarmerStockWeekPage;
