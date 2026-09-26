import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ProductApi from '@/api-requests/product.requests';
import StockTemplateApi, {
  type StockTemplateApplyResultDto,
  type StockTemplateDto,
  type StockTemplateItemInput,
} from '@/api-requests/stock-template.requests';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataState, LoadError } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import useRequest from '@/hooks/useRequest';
import { dayName, formatDate, unitName, vnd } from '@/lib/format';
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

/** Bảng tải chưa xong — cùng số cột với bảng thật để không giật layout khi dữ liệu về (FR-084). */
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
 * Lưới chỉnh sửa cục bộ, khởi tạo một lần từ dữ liệu đã tải (lazy initializer) thay vì effect + setState — tránh đúng
 * lỗi `react-hooks/set-state-in-effect` đã gặp ở trang Markets. Cha chỉ render component này sau khi cả `products` và
 * `initialTemplates` đã sẵn sàng, nên state khởi tạo luôn đúng dữ liệu mới nhất.
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

const todayIso = () => new Date().toISOString().slice(0, 10);

/** "yyyy-MM-dd" (input[type=date] value) → local Date. Avoids the UTC-midnight shift of `new Date(iso)`. */
const parseLocalDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** FR-063 — the weekly stock template a Farmer's products refill from, and applying it to a market day. */
const FarmerStockWeekPage = () => {
  const { t } = useTranslation('FarmerStockWeek');
  const { t: tc } = useTranslation();
  const products = useRequest('farmer-products-for-templates', () => ProductApi.mine());
  const templates = useRequest('stock-templates', () => StockTemplateApi.list());

  const [applyOpen, setApplyOpen] = useState(false);
  const [targetDate, setTargetDate] = useState(todayIso);
  const [applying, setApplying] = useState(false);

  const loading = products.state.kind === 'loading' || templates.state.kind === 'loading';
  const productList = products.state.kind === 'ready' ? products.state.data : NO_PRODUCTS;

  const apply = async () => {
    setApplying(true);
    try {
      const applied: StockTemplateApplyResultDto[] = await StockTemplateApi.apply(targetDate);
      setApplyOpen(false);
      if (applied.length === 0) {
        Notification.info({ title: t('apply.noneTitle'), text: t('apply.noneText') });
      } else {
        Notification.success({
          title: t('apply.doneTitle'),
          text: t('apply.doneText', { count: applied.length, date: formatDate(parseLocalDate(targetDate)) }),
        });
      }
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">{t('title')}</h1>
          <p className="text-body max-w-160">{t('intro')}</p>
        </div>
        {!loading && productList.length > 0 && (
          <Button variant="secondary" onClick={() => setApplyOpen(true)}>
            {t('apply.open')}
          </Button>
        )}
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

      <Dialog
        open={applyOpen}
        title={t('apply.title')}
        onClose={() => setApplyOpen(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setApplyOpen(false)} disabled={applying}>
              {t('apply.keep')}
            </Button>
            <Button onClick={() => void apply()} disabled={applying}>
              {t('apply.confirm')}
            </Button>
          </>
        }
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-[14px] font-bold">{t('apply.dateLabel')}</span>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="border-line-strong bg-surface-raised min-h-9 rounded-sm border-[1.5px] px-2 text-[14px]"
          />
        </label>
        <p className="text-ink-muted text-[14px]">{t('apply.text')}</p>
      </Dialog>
    </div>
  );
};

export default FarmerStockWeekPage;
