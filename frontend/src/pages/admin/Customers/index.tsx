import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { CheckIcon, CloseIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { DataState } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { Pagination } from '@/components/ui/pagination';
import { Table, type TableColumn } from '@/components/ui/table';
import { ADMIN_CUSTOMERS_PATH } from '@/constants/nav';
import { customerCounts, customers, type AdminCustomerType } from '@/data/admin';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

const FILTERS = ['all', 'active', 'inactive', 'joinedThisMonth'] as const;
type Filter = (typeof FILTERS)[number];

/** Pill for the account state. Colour never carries the meaning alone — each state has its own word and glyph. */
export const CustomerStatusPill = ({ active }: { active: boolean }) => {
  const { t } = useTranslation('AdminCustomers');
  return (
    <span
      className={Helper.cn(
        'inline-flex items-center gap-1 rounded-full py-0.75 pr-2.5 pl-2 text-[13px] leading-4.5 font-bold',
        active ? 'bg-status-ready-bg text-status-ready-ink' : 'bg-status-declined-bg text-status-declined-ink',
      )}
    >
      {active ? <CheckIcon size={14} /> : <CloseIcon size={14} />}
      {t(active ? 'status.active' : 'status.inactive')}
    </span>
  );
};

/**
 * FR-072 — deactivate an account for a policy violation; it can no longer sign in or order. Reactivate when it is
 * resolved. Past orders stay with the stalls either way.
 *
 * The list is the frozen demo data in `@/data/admin` until customers have an admin endpoint.
 */
const AdminCustomersPage = () => {
  const { t, i18n } = useTranslation('AdminCustomers');
  const num = (n: number) => new Intl.NumberFormat(i18n.language).format(n);

  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [deactivating, setDeactivating] = useState<AdminCustomerType | null>(null);
  const [reason, setReason] = useState('');

  const needle = query.trim().toLowerCase();
  const rows = customers.filter((c) => {
    if (filter === 'active' && c.status !== 'active') return false;
    if (filter === 'inactive' && c.status !== 'inactive') return false;
    // "This month" is September 2026, the month every seeded figure reports on.
    if (filter === 'joinedThisMonth' && !c.joined.endsWith('/09/2026')) return false;
    if (!needle) return true;
    return [c.name, c.email, c.phone].some((field) => field.toLowerCase().includes(needle));
  });

  const counts: Record<Filter, number> = {
    all: customerCounts.all,
    active: customerCounts.active,
    inactive: customerCounts.inactive,
    joinedThisMonth: customerCounts.joinedThisMonth,
  };

  const confirmDeactivate = () => {
    if (!deactivating) return;
    Notification.success({ text: t('toast.deactivated', { name: deactivating.name }) });
    setDeactivating(null);
    setReason('');
  };

  const columns: TableColumn<AdminCustomerType>[] = [
    {
      key: 'name',
      label: t('col.customer'),
      render: (c) => (
        <>
          <Link to={`${ADMIN_CUSTOMERS_PATH}/${c.id}`} className="text-brand underline">
            <b>{c.name}</b>
          </Link>
          <span className="text-ink-muted block text-[13px]">
            {c.email} · {c.phone}
          </span>
        </>
      ),
    },
    { key: 'joined', label: t('col.joined') },
    { key: 'orders', label: t('col.orders'), align: 'num' },
    {
      key: 'status',
      label: t('col.status'),
      render: (c) => (
        <>
          <CustomerStatusPill active={c.status === 'active'} />
          {c.reason && <span className="text-ink-muted block text-[13px]">{c.reason}</span>}
        </>
      ),
    },
    {
      key: 'action',
      label: '',
      align: 'actions',
      render: (c) =>
        c.status === 'active' ? (
          <Button variant="danger" size="sm" onClick={() => setDeactivating(c)}>
            {t('action.deactivate')}
          </Button>
        ) : (
          <Button size="sm" onClick={() => Notification.success({ text: t('toast.reactivated', { name: c.name }) })}>
            {t('action.reactivate')}
          </Button>
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
        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          className="border-line-strong bg-surface-raised focus-within:outline-focus flex w-full max-w-105 items-stretch overflow-hidden rounded-sm border-[1.5px] focus-within:outline-2 focus-within:outline-offset-1 [&_button]:rounded-none"
        >
          <label htmlFor="admin-customer-q" className="sr-only">
            {t('search.label')}
          </label>
          <input
            id="admin-customer-q"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder={t('search.placeholder')}
            className="text-body min-w-0 flex-1 bg-transparent px-3 outline-none"
          />
          <Button type="submit">{t('search.submit')}</Button>
        </form>
      </div>

      <div role="group" aria-label={t('filterLabel')} className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Chip
            key={f}
            pressed={filter === f}
            onClick={() => {
              setFilter(f);
              setPage(1);
            }}
          >
            {t(`filter.${f}`)}
            <span className="text-ink-muted ml-1">({num(counts[f])})</span>
          </Chip>
        ))}
      </div>

      {rows.length ? (
        <>
          <Table columns={columns} rows={rows} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-small text-ink-muted">
              {t('showing', { from: 1, to: rows.length, total: customerCounts.all })}
            </span>
            <Pagination page={page} pages={Math.ceil(customerCounts.all / 6)} onChange={setPage} />
          </div>
        </>
      ) : (
        <DataState title={t('empty.title')} text={t('empty.text')} />
      )}

      <Dialog
        open={deactivating !== null}
        tone="danger"
        title={deactivating ? t('deactivate.title', { name: deactivating.name }) : ''}
        onClose={() => setDeactivating(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDeactivating(null)}>
              {t('deactivate.keep')}
            </Button>
            <Button variant="danger" onClick={confirmDeactivate}>
              {t('deactivate.confirm')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p>{t('deactivate.text')}</p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="deactivate-reason" className="text-small font-bold">
              {t('deactivate.reason')}
            </label>
            <textarea
              id="deactivate-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="border-line-strong bg-surface-raised focus:outline-focus min-h-18 rounded-sm border-[1.5px] p-3 focus:outline-2"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default AdminCustomersPage;
