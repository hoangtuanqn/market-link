import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Chip } from '@/components/ui/chip';
import { Button, ButtonLink } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Table, type TableColumn } from '@/components/ui/table';
import { product } from '@/data/catalog';
import { unitPrice, units, vnd } from '@/lib/format';
import type { ProductStatus, ProductType } from '@/types/product.types';
import Notification from '@/utils/notification';

const FARMER_PRODUCT_IDS = [1, 2, 7, 19, 26];
const RESERVED: Record<number, number> = { 1: 8, 2: 7, 7: 10, 19: 3 };

const STATUSES: ProductStatus[] = ['available', 'sold_out', 'unavailable'];
const FILTERS: ('all' | ProductStatus)[] = ['all', ...STATUSES];

/** FR-062 FR-064 — everything this stall can list: price, this week's count, reserved units and status. */
const FarmerProductsPage = () => {
  const { t } = useTranslation('FarmerProducts');
  const seeded = FARMER_PRODUCT_IDS.map((id) => product(id)!);
  const [statuses, setStatuses] = useState<Record<number, ProductStatus>>(
    Object.fromEntries(seeded.map((p) => [p.id, p.status])),
  );
  const [filter, setFilter] = useState<'all' | ProductStatus>('all');
  const [deleteTarget, setDeleteTarget] = useState<ProductType | null>(null);

  const counts: Record<'all' | ProductStatus, number> = {
    all: seeded.length,
    available: seeded.filter((p) => statuses[p.id] === 'available').length,
    sold_out: seeded.filter((p) => statuses[p.id] === 'sold_out').length,
    unavailable: seeded.filter((p) => statuses[p.id] === 'unavailable').length,
  };
  const rows = filter === 'all' ? seeded : seeded.filter((p) => statuses[p.id] === filter);

  const columns: TableColumn<ProductType>[] = [
    {
      key: 'n',
      label: t('col.product'),
      render: (p) => (
        <>
          <Link
            to={`/farmer/products/${p.id}/edit`}
            className="text-brand font-bold underline-offset-2 hover:underline"
          >
            {p.name}
          </Link>
          <span className="text-ink-muted mt-0.5 block text-[13px] font-normal">{p.category}</span>
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
            {vnd(price.amount)}{' '}
            <span className="text-ink-muted font-normal">{t('perUnit', { unit: price.unit ?? p.unit })}</span>
          </>
        );
      },
    },
    {
      key: 's',
      label: t('col.left'),
      align: 'num',
      render: (p) => (statuses[p.id] === 'available' ? units(p.stock, p.unit, p.plural) : '—'),
    },
    { key: 'r', label: t('col.reserved'), align: 'num', render: (p) => RESERVED[p.id] ?? 0 },
    {
      key: 'st',
      label: t('col.status'),
      render: (p) => (
        <select
          value={statuses[p.id]}
          aria-label={t('statusOf', { name: p.name })}
          onChange={(e) => {
            const value = e.target.value as ProductStatus;
            setStatuses((prev) => ({ ...prev, [p.id]: value }));
            Notification.success({ title: t('toast.statusSaved'), text: t(`toast.status.${value}`) });
          }}
          className="border-line-strong bg-surface-raised min-h-9 rounded-sm border-[1.5px] px-2 text-[14px]"
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
          <ButtonLink variant="secondary" size="sm" to={`/farmer/products/${p.id}/edit`}>
            {t('edit')}
          </ButtonLink>
          <Button variant="danger" size="sm" onClick={() => setDeleteTarget(p)}>
            {t('delete')}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">{t('title')}</h1>
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

      <Table caption={t('caption', { count: seeded.length })} columns={columns} rows={rows} />

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
            <Button
              variant="danger"
              onClick={() => {
                Notification.success({
                  title: t('toast.deleted'),
                  text: t('toast.deletedText', { name: deleteTarget?.name }),
                });
                setDeleteTarget(null);
              }}
            >
              {t('dialog.confirm')}
            </Button>
          </>
        }
      >
        <p>{t('dialog.text')}</p>
        <p className="text-ink-muted text-[14px]">{t('dialog.pauseHint')}</p>
      </Dialog>
    </div>
  );
};

export default FarmerProductsPage;
