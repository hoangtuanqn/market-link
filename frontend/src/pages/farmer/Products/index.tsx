import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import ProductApi from '@/api-requests/product.requests';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import { Button, ButtonLink } from '@/components/ui/button';
import { stockDay } from '@/components/stockDay';
import { Chip } from '@/components/ui/chip';
import { DataState, LoadError } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/input';
import { Table, type TableColumn } from '@/components/ui/table';
import useRequest from '@/hooks/useRequest';
import { unitPrice, units, money } from '@/lib/format';
import type { ProductStatus, ProductType } from '@/types/product.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

const STATUSES: ProductStatus[] = ['available', 'sold_out', 'unavailable'];
const FILTERS: ('all' | ProductStatus)[] = ['all', ...STATUSES];
const NO_PRODUCTS: ProductType[] = [];

/** FR-062 FR-064 — everything this stall can list: price, what is left and reserved for the next pickup day, status. */
const FarmerProductsPage = () => {
  const { t } = useTranslation('FarmerProducts');
  const { t: tc } = useTranslation();
  const { state: load, retry, mutate } = useRequest('my-products', () => ProductApi.mine());
  const all = load.kind === 'ready' ? load.data : NO_PRODUCTS;
  const [filter, setFilter] = useState<'all' | ProductStatus>('all');
  const [deleteTarget, setDeleteTarget] = useState<ProductType | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<ProductType | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustPrice, setAdjustPrice] = useState('');
  const [adjustError, setAdjustError] = useState<string | undefined>();
  const [busyId, setBusyId] = useState<number | null>(null);

  const counts: Record<'all' | ProductStatus, number> = {
    all: all.length,
    available: all.filter((p) => p.status === 'available').length,
    sold_out: all.filter((p) => p.status === 'sold_out').length,
    unavailable: all.filter((p) => p.status === 'unavailable').length,
  };
  const rows = filter === 'all' ? all : all.filter((p) => p.status === filter);

  const changeStatus = async (p: ProductType, value: ProductStatus) => {
    setBusyId(p.id);
    try {
      const saved = await ProductApi.setStatus(p.id, value);
      // A status change moves no stock; keep the next-date numbers only the list read carries
      mutate((list) =>
        list.map((row) =>
          row.id === p.id
            ? { ...saved, nextDate: row.nextDate, nextLeft: row.nextLeft, nextReserved: row.nextReserved }
            : row,
        ),
      );
      Notification.success({ title: t('toast.statusSaved'), text: t(`toast.status.${value}`) });
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setBusyId(null);
    }
  };

  const openAdjust = (p: ProductType) => {
    setAdjustTarget(p);
    setAdjustQuantity(String(p.nextLeft ?? 0));
    setAdjustPrice('');
    setAdjustError(undefined);
  };

  const confirmAdjust = async () => {
    if (!adjustTarget?.nextDate) return;
    const quantity = Number(adjustQuantity);
    if (!Number.isInteger(quantity) || quantity < 0) {
      setAdjustError(t('adjustDialog.error.quantity'));
      return;
    }
    const price = adjustPrice.trim() === '' ? null : Number(adjustPrice);
    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      setAdjustError(t('adjustDialog.error.price'));
      return;
    }
    setAdjustError(undefined);
    setBusyId(adjustTarget.id);
    try {
      await ProductApi.overrideDailyStock(adjustTarget.id, adjustTarget.nextDate, quantity, price);
      // The new number can change which date is "next" (e.g. dropping to 0), so reload the list
      // instead of hand-patching nextLeft.
      retry();
      Notification.success({ text: t('toast.stockAdjusted', { day: stockDay(adjustTarget.nextDate) }) });
      setAdjustTarget(null);
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await ProductApi.remove(deleteTarget.id);
      mutate((list) => list.filter((row) => row.id !== deleteTarget.id));
      Notification.success({ title: t('toast.deleted'), text: t('toast.deletedText', { name: deleteTarget.name }) });
      setDeleteTarget(null);
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setBusyId(null);
    }
  };

  const columns: TableColumn<ProductType>[] = [
    {
      key: 'n',
      label: t('col.product'),
      render: (p) => (
        <>
          <Link
            to={`/farmer/products/${p.id}/edit`}
            className="text-brand inline-flex min-h-11 items-center font-bold underline-offset-2 hover:underline"
          >
            {p.name}
          </Link>
          <span className="text-ink-muted mt-0.5 block text-[13px] font-normal">{p.category}</span>
          {p.hidden && (
            <span className="text-danger mt-0.5 block text-[13px] font-normal">
              {t('hiddenByAdmin', { reason: p.hiddenReason ?? '' })}
            </span>
          )}
        </>
      ),
    },
    {
      key: 'p',
      label: t('col.price'),
      align: 'num',
      render: (p) => {
        const price = unitPrice(p.price, p.unit);
        return (
          <>
            {money(price.amount)}{' '}
            <span className="text-ink-muted font-normal">{t('perUnit', { unit: price.unit ?? p.unit })}</span>
          </>
        );
      },
    },
    {
      // FR-031/FR-063: stock is per pickup date, so show the nearest date a customer can still order for and what is
      // left for it — not products.stock_quantity, which is only the base number the edit form starts from.
      key: 's',
      label: t('col.left'),
      align: 'num',
      render: (p) => {
        const day = stockDay(p.nextDate);
        return p.status === 'available' && day
          ? t('nextLeft', { day, qty: units(p.nextLeft ?? 0, p.unit, p.plural) })
          : '—';
      },
    },
    {
      // Units that placed, accepted and ready orders hold for that same date.
      key: 'r',
      label: t('col.reserved'),
      align: 'num',
      render: (p) => (p.nextDate ? units(p.nextReserved ?? 0, p.unit, p.plural) : '—'),
    },
    {
      key: 'st',
      label: t('col.status'),
      render: (p) => (
        <select
          value={p.status}
          aria-label={t('statusOf', { name: p.name })}
          disabled={busyId === p.id}
          onChange={(e) => void changeStatus(p, e.target.value as ProductStatus)}
          className="border-line-strong bg-surface-raised min-h-11 rounded-sm border-[1.5px] px-2 text-[14px]"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`status.${s}`)}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'a',
      label: '',
      align: 'actions',
      render: (p) => (
        <div className="flex justify-end gap-2">
          {p.nextDate && (
            <Button variant="secondary" size="sm" onClick={() => openAdjust(p)} disabled={busyId === p.id}>
              {t('adjust')}
            </Button>
          )}
          <ButtonLink variant="secondary" size="sm" to={`/farmer/products/${p.id}/edit`}>
            {t('edit')}
          </ButtonLink>
          <Button variant="danger" size="sm" onClick={() => setDeleteTarget(p)} disabled={busyId === p.id}>
            {t('delete')}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1 text-ink font-bold">{t('title')}</h1>
          <p className="text-body max-w-160">{t('intro')}</p>
        </div>
        <ButtonLink to="/farmer/products/new">{t('add')}</ButtonLink>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Chip key={f} pressed={filter === f} onClick={() => setFilter(f)}>
            {f === 'all' ? t('filterAll') : t(`status.${f}`)}{' '}
            <span className="text-[12px] tabular-nums opacity-80">{counts[f]}</span>
          </Chip>
        ))}
      </div>

      <div className="flex min-h-[440px] flex-1 flex-col">
        {load.kind === 'loading' ? (
          <MarketCardSkeleton count={3} />
        ) : load.kind === 'error' ? (
          <LoadError noun={t('error.noun')} onRetry={retry} />
        ) : rows.length ? (
          <Table
            className="h-full flex-1"
            caption={t('caption', { count: all.length })}
            columns={columns}
            rows={rows}
          />
        ) : (
          <DataState fill title={t('empty.title')} text={t('empty.text')} className="h-full min-h-[440px] w-full" />
        )}
      </div>

      <p className="text-small text-ink-muted">{t('footNote')}</p>

      <Dialog
        open={deleteTarget !== null}
        title={t('dialog.title', { name: deleteTarget?.name ?? '' })}
        tone="danger"
        onClose={() => setDeleteTarget(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              {t('dialog.keep')}
            </Button>
            <Button variant="danger" onClick={() => void confirmDelete()} disabled={busyId !== null}>
              {t('dialog.confirm')}
            </Button>
          </>
        }
      >
        <p>{t('dialog.text')}</p>
        <p className="text-ink-muted text-[14px]">{t('dialog.pauseHint')}</p>
      </Dialog>

      <Dialog
        open={adjustTarget !== null}
        title={adjustTarget ? t('adjustDialog.title', { day: stockDay(adjustTarget.nextDate) }) : ''}
        onClose={() => setAdjustTarget(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setAdjustTarget(null)}>
              {t('adjustDialog.cancel')}
            </Button>
            <Button onClick={() => void confirmAdjust()} disabled={busyId !== null}>
              {t('adjustDialog.confirm')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field
            id="adjust-quantity"
            label={t('adjustDialog.quantity')}
            type="number"
            min={0}
            required
            value={adjustQuantity}
            onChange={(e) => setAdjustQuantity(e.target.value)}
            error={adjustError}
          />
          <Field
            id="adjust-price"
            label={t('adjustDialog.price')}
            type="number"
            min={0}
            step={0.01}
            placeholder={adjustTarget ? String(adjustTarget.price) : ''}
            hint={t('adjustDialog.priceHint')}
            value={adjustPrice}
            onChange={(e) => setAdjustPrice(e.target.value)}
          />
        </div>
      </Dialog>
    </div>
  );
};

export default FarmerProductsPage;
