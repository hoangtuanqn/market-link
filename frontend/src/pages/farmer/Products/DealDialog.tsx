import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DealApi, { type DailyStockDto } from '@/api-requests/deal.requests';
import { stockDay } from '@/components/stockDay';
import { Button } from '@/components/ui/button';
import { DataState, LoadError } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { Field, SelectField } from '@/components/ui/input';
import useRequest from '@/hooks/useRequest';
import {
  checkDeal,
  dealPrice,
  DISCOUNT_STEP,
  MAX_DISCOUNT,
  MIN_DISCOUNT,
  suggestedDiscount,
  todayYmd,
} from '@/lib/deals';
import { perUnit, units } from '@/lib/format';
import type { ProductType } from '@/types/product.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

type DealDialogProps = {
  product: ProductType;
  onClose: () => void;
  /** The day's stock row as saved, so the page can update what it shows for that day. */
  onPosted: (row: DailyStockDto) => void;
};

/** Shown until there is a suggestion (no packing date yet) and the Farmer has not picked a discount. */
const FALLBACK_DISCOUNT = 20;
const NO_DAYS: DailyStockDto[] = [];

/**
 * FR-124 — puts one pickup day of a product on a near-expiry deal (spec §4.5.3). The rules are checked as the Farmer
 * types (lib/deals.ts, the same table as the server's DealPolicy), and the server checks them again. Each field starts
 * from the chosen day's own numbers, its current deal included, until the Farmer changes it.
 */
const DealDialog = ({ product, onClose, onPosted }: DealDialogProps) => {
  const { t } = useTranslation('FarmerProducts');
  const { t: tc } = useTranslation();
  const { state, retry } = useRequest(`deal-days:${product.id}`, () => DealApi.pickupDays(product.id));
  const days = state.kind === 'ready' ? state.data : NO_DAYS;
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  const [qtyText, setQtyText] = useState<string | null>(null);
  const [packedOn, setPackedOn] = useState<string | null>(null);
  const [percent, setPercent] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const day = days.find((d) => d.stockDate === pickedDay) ?? days[0];
  const today = todayYmd();
  const shelfLife = product.shelfLifeDays ?? 0;
  const qty = qtyText ?? String(day?.quantityAvailable ?? '');
  const packed = packedOn ?? day?.packedOn ?? '';
  const check = day && packed ? checkDeal(shelfLife, packed, day.stockDate, today) : null;
  const suggested = check && check.problem === null ? suggestedDiscount(check.daysLeft, shelfLife) : null;
  const pct = percent ?? day?.discountPercent ?? suggested ?? FALLBACK_DISCOUNT;
  const listPrice = day ? (day.listPrice ?? day.unitPrice) : 0;
  const quantity = Number(qty);
  const dayLabel = day ? (stockDay(day.stockDate) ?? day.stockDate) : '';

  // Why "Post deal" is off, shown next to it
  const why = !packed
    ? t('dealDialog.why.packedOn')
    : check?.problem
      ? t(`dealDialog.why.${check.problem}`, { shelfLife })
      : !Number.isInteger(quantity) || quantity < 1
        ? t('dealDialog.why.qty')
        : null;

  const pickDay = (value: string) => {
    setPickedDay(value);
    setQtyText(null);
    setPackedOn(null);
    setPercent(null);
  };

  const post = async () => {
    if (!day || why) return;
    setSaving(true);
    try {
      const saved = await DealApi.post(product.id, day.stockDate, {
        quantityAvailable: quantity,
        packedOn: packed,
        discountPercent: pct,
      });
      Notification.success({
        title: t('dealDialog.posted'),
        text: t('dealDialog.postedText', { name: product.name, percent: pct, day: dayLabel }),
      });
      onPosted(saved);
      onClose();
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      title={t('dealDialog.title', { name: product.name })}
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {tc('actions.cancel')}
          </Button>
          <Button onClick={() => void post()} disabled={state.kind !== 'ready' || !day || why !== null || saving}>
            {saving ? t('dealDialog.posting') : t('dealDialog.post')}
          </Button>
        </>
      }
    >
      {state.kind === 'loading' ? (
        <p role="status" className="text-ink-muted">
          {t('dealDialog.loadingDays')}
        </p>
      ) : state.kind === 'error' ? (
        <LoadError noun={t('dealDialog.daysNoun')} onRetry={retry} />
      ) : !day ? (
        <DataState title={t('dealDialog.noDays.title')} text={t('dealDialog.noDays.text')} />
      ) : (
        <div className="flex flex-col gap-4">
          <SelectField
            id="deal-day"
            label={t('dealDialog.day')}
            value={day.stockDate}
            onChange={(e) => pickDay(e.target.value)}
            options={days.map((d) => ({ value: d.stockDate, label: stockDay(d.stockDate) ?? d.stockDate }))}
          />
          <Field
            id="deal-qty"
            label={t('dealDialog.qty', { unit: product.unit })}
            type="number"
            inputMode="numeric"
            min={1}
            value={qty}
            onChange={(e) => setQtyText(e.target.value)}
            hint={t('dealDialog.onSale', { qty: units(day.quantityAvailable, product.unit, product.plural) })}
          />
          <Field
            id="deal-packed"
            label={t('dealDialog.packedOn')}
            type="date"
            max={today}
            value={packed}
            onChange={(e) => setPackedOn(e.target.value)}
          />
          {check && check.problem === null && (
            <p className="text-body">
              {t('dealDialog.result', {
                until: stockDay(check.bestBefore) ?? check.bestBefore,
                count: check.daysLeft,
                shelfLife,
              })}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-small font-bold">{t('dealDialog.discount')}</span>
            <Button
              variant="secondary"
              size="sm"
              aria-label={t('dealDialog.less')}
              disabled={pct <= MIN_DISCOUNT}
              onClick={() => setPercent(pct - DISCOUNT_STEP)}
            >
              −
            </Button>
            <output aria-live="polite" className="min-w-12 text-center font-bold tabular-nums">
              {`${pct}%`}
            </output>
            <Button
              variant="secondary"
              size="sm"
              aria-label={t('dealDialog.more')}
              disabled={pct >= MAX_DISCOUNT}
              onClick={() => setPercent(pct + DISCOUNT_STEP)}
            >
              +
            </Button>
            {suggested !== null && (
              <span className="text-small text-ink-muted">{t('dealDialog.suggested', { percent: suggested })}</span>
            )}
          </div>
          <p className="text-body flex flex-wrap items-baseline gap-2">
            <span className="text-small font-bold">{t('dealDialog.price')}</span>
            <span>
              {t('dealDialog.priceLine', {
                from: perUnit(listPrice, product.unit),
                to: perUnit(dealPrice(listPrice, pct), product.unit),
              })}
            </span>
          </p>
          {why && <p className="text-small text-danger">{why}</p>}
        </div>
      )}
    </Dialog>
  );
};

export default DealDialog;
