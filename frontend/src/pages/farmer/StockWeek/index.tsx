import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ProductApi from '@/api-requests/product.requests';
import StockTemplateApi, {
  type StockTemplateDto,
  type StockTemplateItemInput,
} from '@/api-requests/stock-template.requests';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataState, LoadError } from '@/components/ui/data-state';
import useRequest from '@/hooks/useRequest';
import { dayName, unitName, vnd } from '@/lib/format';
import type { ProductType } from '@/types/product.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

/** Monday first, matches how FarmerOperatingDays already lists the week in this app. */
const DAYS = [1, 2, 3, 4, 5, 6, 0];
const NO_PRODUCTS: ProductType[] = [];

const th =
  'bg-surface-sunken text-ink-muted px-2.5 py-2 text-left text-[12px] font-bold tracking-[0.08em] whitespace-nowrap uppercase';
const td = 'border-line border-t px-2.5 py-2 align-middle';

type Cell = { quantity: string; price: string };
const cellKey = (productId: number, day: number) => `${productId}:${day}`;

function seedCells(templates: StockTemplateDto[]): Record<string, Cell> {
  const cells: Record<string, Cell> = {};
  for (const row of templates) {
    cells[cellKey(row.productId, row.dayOfWeek)] = {
      quantity: String(row.defaultQuantity),
      price: row.defaultPrice == null ? '' : String(row.defaultPrice),
    };
  }
  return cells;
}

/** The table hasn't loaded yet — same column count as the real table so nothing jumps once data lands (FR-084). */
const TemplateGridSkeleton = () => {
  const { t } = useTranslation('FarmerStockWeek');
  return (
    <Card className="overflow-x-auto" role="status" aria-live="polite">
      <span className="sr-only">{t('title')}</span>
      <table className="w-full border-collapse text-[14px]" aria-hidden="true">
        <tbody>
          {Array.from({ length: 4 }, (_, i) => (
            <tr key={i}>
              <td className={td}>
                <span className="ml-skel h-4.5 w-28" />
              </td>
              {DAYS.map((d) => (
                <td key={d} className={td}>
                  <span className="ml-skel h-9 w-20" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
};

/**
 * A locally-edited grid, seeded once from the loaded data via a lazy initializer instead of effect + setState — the
 * same `react-hooks/set-state-in-effect` trap hit on the Markets page. The parent only renders this component once both
 * `products` and `initialTemplates` are ready, so the initial state is always the latest data.
 */
const TemplateGrid = ({
  products,
  initialTemplates,
  onSaved,
}: {
  products: ProductType[];
  initialTemplates: StockTemplateDto[];
  onSaved: (rows: StockTemplateDto[]) => void;
}) => {
  const { t } = useTranslation('FarmerStockWeek');
  const { t: tc } = useTranslation();
  const [cells, setCells] = useState<Record<string, Cell>>(() => seedCells(initialTemplates));
  const [saving, setSaving] = useState(false);

  const setCell = (productId: number, day: number, patch: Partial<Cell>) => {
    const key = cellKey(productId, day);
    setCells((prev) => ({ ...prev, [key]: { ...(prev[key] ?? { quantity: '', price: '' }), ...patch } }));
  };

  const save = async () => {
    const items: StockTemplateItemInput[] = [];
    for (const p of products) {
      for (const day of DAYS) {
        const cell = cells[cellKey(p.id, day)];
        if (!cell || cell.quantity.trim() === '') continue;
        const quantity = Number(cell.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) continue;
        const price = cell.price.trim() === '' ? null : Number(cell.price);
        items.push({ productId: p.id, dayOfWeek: day, defaultQuantity: quantity, defaultPrice: price });
      }
    }
    setSaving(true);
    try {
      const rows = await StockTemplateApi.replace(items);
      onSaved(rows);
      Notification.success({ title: t('saved'), text: t('template.savedText') });
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Card className="overflow-x-auto">
        <table className="w-full border-collapse text-[14px]">
          <caption className="sr-only">{t('table.caption')}</caption>
          <thead>
            <tr>
              <th className={th}>{t('col.product')}</th>
              {DAYS.map((day) => (
                <th key={day} className={th}>
                  {dayName(day)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td className={td}>
                  <b>{p.name}</b>
                  <span className="text-ink-muted mt-0.5 block text-[12px] font-normal">
                    {t('per', { unit: unitName(p.unit) })} · {t('currentPrice', { price: vnd(p.price) })}
                  </span>
                </td>
                {DAYS.map((day) => {
                  const cell = cells[cellKey(p.id, day)] ?? { quantity: '', price: '' };
                  return (
                    <td key={day} className={td}>
                      <div className="flex flex-col gap-1">
                        <input
                          type="number"
                          min={0}
                          value={cell.quantity}
                          onChange={(e) => setCell(p.id, day, { quantity: e.target.value })}
                          aria-label={t('aria.quantity', { product: p.name, day: dayName(day, 'long') })}
                          placeholder="0"
                          className="border-line-strong bg-surface-raised min-h-9 w-20 rounded-sm border-[1.5px] px-2 text-right text-[14px] tabular-nums"
                        />
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={cell.price}
                          onChange={(e) => setCell(p.id, day, { price: e.target.value })}
                          aria-label={t('aria.price', { product: p.name, day: dayName(day, 'long') })}
                          placeholder={t('defaultPricePlaceholder')}
                          className="border-line text-ink-muted min-h-8 w-20 rounded-sm border px-2 text-right text-[12px] tabular-nums"
                        />
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void save()} disabled={saving}>
          {t('template.save')}
        </Button>
        <span className="text-small text-ink-muted">{t('template.note')}</span>
      </div>
    </div>
  );
};

/**
 * FR-063 — the weekly stock template a Farmer's products refill from. Availability for a pickup date is now computed
 * automatically from this template (see the backend design doc); there is no "Apply" action here anymore.
 */
const FarmerStockWeekPage = () => {
  const { t } = useTranslation('FarmerStockWeek');
  const products = useRequest('farmer-products-for-templates', () => ProductApi.mine());
  const templates = useRequest('stock-templates', () => StockTemplateApi.list());

  const loading = products.state.kind === 'loading' || templates.state.kind === 'loading';
  const productList = products.state.kind === 'ready' ? products.state.data : NO_PRODUCTS;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body max-w-160">{t('intro')}</p>
      </div>

      {loading && <TemplateGridSkeleton />}

      {!loading && products.state.kind === 'error' && (
        <LoadError noun={t('error.productsNoun')} onRetry={products.retry} />
      )}

      {!loading && products.state.kind === 'ready' && templates.state.kind === 'error' && (
        <LoadError noun={t('error.templateNoun')} onRetry={templates.retry} />
      )}

      {!loading && productList.length === 0 && products.state.kind === 'ready' && templates.state.kind !== 'error' && (
        <DataState
          variant="empty"
          fill
          title={t('empty.title')}
          text={t('empty.text')}
          action={
            <ButtonLink to="/farmer/products/new" size="sm">
              {t('empty.action')}
            </ButtonLink>
          }
        />
      )}

      {!loading && products.state.kind === 'ready' && templates.state.kind === 'ready' && productList.length > 0 && (
        <TemplateGrid
          products={productList}
          initialTemplates={templates.state.data}
          onSaved={(rows) => templates.mutate(() => rows)}
        />
      )}
    </div>
  );
};

export default FarmerStockWeekPage;
