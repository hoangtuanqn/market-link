import { useState } from 'react';
import { Link } from 'react-router';
import { Chip } from '@/components/ui/chip';
import { Button, ButtonLink } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Table, type TableColumn } from '@/components/ui/table';
import { product } from '@/data/catalog';
import { units, vnd } from '@/lib/format';
import type { ProductStatus, ProductType } from '@/types/product.types';
import Notification from '@/utils/notification';

const FARMER_PRODUCT_IDS = [1, 2, 7, 19, 26];
const RESERVED: Record<number, number> = { 1: 8, 2: 7, 7: 10, 19: 3 };

const STATUS_LABEL: Record<ProductStatus, string> = {
  available: 'Available',
  sold_out: 'Sold out',
  unavailable: 'Paused',
};
const STATUS_TOAST: Record<ProductStatus, string> = {
  available: 'The product is listed again.',
  sold_out: 'Customers now see “Sold out” and can ask to be told when it is back.',
  unavailable: 'The product is hidden from customers until you set it back.',
};

const FILTERS: { id: 'all' | ProductStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'available', label: 'Available' },
  { id: 'sold_out', label: 'Sold out' },
  { id: 'unavailable', label: 'Paused' },
];

/** FR-062 FR-064 — everything this stall can list: price, this week's count, reserved units and status. */
const FarmerProductsPage = () => {
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
      label: 'Product',
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
      label: 'Price',
      align: 'num',
      render: (p) => (
        <>
          {vnd(p.price)} <span className="text-ink-muted font-normal">per {p.unit}</span>
        </>
      ),
    },
    {
      key: 's',
      label: 'Left this week',
      align: 'num',
      render: (p) => (statuses[p.id] === 'available' ? units(p.stock, p.unit, p.plural) : '—'),
    },
    { key: 'r', label: 'Reserved', align: 'num', render: (p) => RESERVED[p.id] ?? 0 },
    {
      key: 'st',
      label: 'Status',
      render: (p) => (
        <select
          value={statuses[p.id]}
          aria-label={`Status of ${p.name}`}
          onChange={(e) => {
            const value = e.target.value as ProductStatus;
            setStatuses((prev) => ({ ...prev, [p.id]: value }));
            Notification.success({ title: 'Status saved', text: STATUS_TOAST[value] });
          }}
          className="border-line-strong bg-surface-raised min-h-9 rounded-sm border-[1.5px] px-2 text-[14px]"
        >
          {(Object.keys(STATUS_LABEL) as ProductStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
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
            Edit
          </ButtonLink>
          <Button variant="danger" size="sm" onClick={() => setDeleteTarget(p)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">Products</h1>
          <p className="text-body max-w-160">
            Everything you can list. Mark a product sold out when it runs out on market day, or pause it when it is not
            in season.
          </p>
        </div>
        <ButtonLink to="/farmer/products/new">Add product</ButtonLink>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Chip key={f.id} pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label} <span className="text-[12px] tabular-nums opacity-80">{counts[f.id]}</span>
          </Chip>
        ))}
      </div>

      <Table caption={`${seeded.length} products`} columns={columns} rows={rows} />

      <p className="text-small text-ink-muted">
        Deleting a product removes it from the catalogue; past orders keep their lines. Photos: 4:3, natural light, on
        wood or paper.
      </p>

      <Dialog
        open={deleteTarget !== null}
        title={`Delete ${deleteTarget?.name ?? ''}?`}
        tone="danger"
        onClose={() => setDeleteTarget(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Keep product
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                Notification.success({ title: 'Deleted', text: `${deleteTarget?.name} deleted.` });
                setDeleteTarget(null);
              }}
            >
              Delete product
            </Button>
          </>
        }
      >
        <p>It disappears from the catalogue and from your template. Orders that already include it are not changed.</p>
        <p className="text-ink-muted text-[14px]">To stop selling it for a while, choose Paused instead.</p>
      </Dialog>
    </div>
  );
};

export default FarmerProductsPage;
