import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AdminReportApi, type AdminCustomerDto } from '@/api-requests/report.requests';
import Avatar from '@/components/Avatar';
import { CheckIcon, CloseIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { DataState, LoadError } from '@/components/ui/data-state';
import Tabs from '@/components/ui/tabs';
import ReasonPicker from '@/components/ReasonPicker';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Table, type TableColumn } from '@/components/ui/table';
import { ADMIN_CUSTOMERS_PATH } from '@/constants/nav';
import useRequest from '@/hooks/useRequest';
import { formatDate } from '@/lib/format';
import { composeReason, emptyReason, type ReasonValue } from '@/lib/reasons';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';
import CustomerTableSkeleton from './CustomerTableSkeleton';

const FILTERS = ['all', 'active', 'inactive'] as const;
type Filter = (typeof FILTERS)[number];
const PAGE_SIZE = 10;
const NO_ROWS: AdminCustomerDto[] = [];

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

type ConfirmKind = 'deactivate' | 'reactivate';
type ConfirmAction = { kind: ConfirmKind; item: AdminCustomerDto } | null;

/**
 * FR-072 — deactivate an account for a policy violation; it can no longer sign in or order. Reactivate when it is
 * resolved. Past orders stay with the stalls either way. The server does not store a reason (`AdminReportApi.
 * setCustomerStatus` takes only the new status) — the reason box here is echoed in the toast only, not sent.
 */
const AdminCustomersPage = () => {
  const { t } = useTranslation('AdminCustomers');
  const { t: tc } = useTranslation();
  const [filter, setFilter] = useState<Filter>('all');
  const [queryDraft, setQueryDraft] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [reason, setReason] = useState<ReasonValue>(emptyReason);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const {
    state: load,
    retry,
    mutate,
  } = useRequest(`admin-customers:${filter}:${query}:${page}`, () =>
    AdminReportApi.customers({
      status: filter === 'all' ? undefined : filter,
      q: query || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
  );

  const { state: countsLoad, retry: retryCounts } = useRequest(`admin-customer-counts:${query}`, () =>
    Promise.all(
      FILTERS.map((f) =>
        AdminReportApi.customers({ status: f === 'all' ? undefined : f, q: query || undefined, page: 1, pageSize: 1 }),
      ),
    ).then((responses) => {
      const next: Partial<Record<Filter, number>> = {};
      FILTERS.forEach((f, i) => {
        next[f] = responses[i]?.total;
      });
      return next;
    }),
  );
  const counts = countsLoad.kind === 'ready' ? countsLoad.data : {};

  const rows = load.kind === 'ready' ? load.data.items : NO_ROWS;
  const total = load.kind === 'ready' ? load.data.total : 0;
  const showSkeleton = load.kind === 'loading' || initialLoading;

  const changeFilter = (f: Filter) => {
    if (f === filter) return;
    setFilter(f);
    setPage(1);
  };

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    setQuery(queryDraft.trim());
    setPage(1);
  };

  const openConfirm = (kind: ConfirmKind, item: AdminCustomerDto) => {
    setReason(emptyReason());
    setConfirmAction({ kind, item });
  };

  const runConfirmedAction = async () => {
    if (!confirmAction) return;
    const { kind, item } = confirmAction;
    const status = kind === 'deactivate' ? 'inactive' : 'active';
    setBusyId(item.userId);
    setConfirmAction(null);
    try {
      const updated = await AdminReportApi.setCustomerStatus(item.userId, status);
      mutate((data) => ({ ...data, items: data.items.map((c) => (c.userId === item.userId ? updated : c)) }));
      retryCounts();
      const trimmedReason = composeReason('deactivate', reason);
      const toastKey =
        kind === 'deactivate'
          ? trimmedReason
            ? 'toast.deactivatedWithReason'
            : 'toast.deactivated'
          : 'toast.reactivated';
      Notification.success({ text: t(toastKey, { name: item.fullName, reason: trimmedReason }) });
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setBusyId(null);
    }
  };

  const columns: TableColumn<AdminCustomerDto>[] = [
    {
      key: 'name',
      label: t('col.customer'),
      render: (c) => (
        <div className="flex items-center gap-3">
          <Avatar name={c.fullName} email={c.email} url={c.avatarUrl ?? undefined} size={36} className="shrink-0" />
          <div className="min-w-0">
            <Link
              to={`${ADMIN_CUSTOMERS_PATH}/${c.userId}`}
              className="text-brand block truncate font-bold underline hover:opacity-85"
            >
              {c.fullName}
            </Link>
            <span className="text-ink-muted block truncate text-[13px]">
              {c.email} {c.phone ? `· ${c.phone}` : ''}
            </span>
          </div>
        </div>
      ),
    },
    { key: 'joined', label: t('col.joined'), render: (c) => formatDate(new Date(c.createdAt)) },
    { key: 'orders', label: t('col.orders'), align: 'num', render: (c) => c.orderCount },
    { key: 'status', label: t('col.status'), render: (c) => <CustomerStatusPill active={c.status === 'active'} /> },
    {
      key: 'action',
      label: '',
      align: 'actions',
      render: (c) => {
        const busy = busyId === c.userId;
        return c.status === 'active' ? (
          <Button variant="danger" size="sm" disabled={busy} onClick={() => openConfirm('deactivate', c)}>
            {t('action.deactivate')}
          </Button>
        ) : (
          <Button size="sm" disabled={busy} onClick={() => openConfirm('reactivate', c)}>
            {t('action.reactivate')}
          </Button>
        );
      },
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1 text-ink font-bold">{t('title')}</h1>
          <p className="text-body max-w-160">{t('intro')}</p>
        </div>
        <form role="search" onSubmit={submitSearch} className="flex min-w-70 flex-1 items-end gap-2">
          <div className="flex-1">
            <Field
              id="admin-customer-q"
              label={t('search.label')}
              hideLabel
              type="search"
              placeholder={t('search.placeholder')}
              value={queryDraft}
              onChange={(e) => setQueryDraft(e.target.value)}
            />
          </div>
          <Button type="submit">{t('search.submit')}</Button>
        </form>
      </div>

      <Tabs
        label={t('filterLabel')}
        value={filter}
        onChange={(id) => changeFilter(id as Filter)}
        tabs={FILTERS.map((f) => ({
          id: f,
          label: t(`filter.${f}`),
          count: counts[f],
        }))}
      />

      {showSkeleton ? (
        <CustomerTableSkeleton />
      ) : load.kind === 'error' ? (
        <LoadError noun={t('noun')} onRetry={retry} className="w-full flex-1" />
      ) : rows.length ? (
        <div className="flex flex-1 flex-col justify-between gap-4">
          <Table
            caption={t('caption', { count: total })}
            columns={columns}
            rows={rows}
            className="min-h-[380px] w-full flex-1"
          />
          {total > PAGE_SIZE && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="text-small text-ink-muted">
                {t('showing', { from: (page - 1) * PAGE_SIZE + 1, to: (page - 1) * PAGE_SIZE + rows.length, total })}
              </span>
              <Pagination page={page} pages={Math.ceil(total / PAGE_SIZE)} onChange={setPage} />
            </div>
          )}
        </div>
      ) : (
        <DataState fill title={t('empty.title')} text={t('empty.text')} className="min-h-[380px] w-full flex-1" />
      )}

      <Dialog
        open={confirmAction !== null}
        tone={confirmAction?.kind === 'deactivate' ? 'danger' : undefined}
        title={confirmAction ? t(`${confirmAction.kind}.title`, { name: confirmAction.item.fullName }) : ''}
        onClose={() => setConfirmAction(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmAction(null)} disabled={busyId !== null}>
              {t(confirmAction?.kind === 'deactivate' ? 'deactivate.keep' : 'reactivate.keep')}
            </Button>
            <Button
              variant={confirmAction?.kind === 'deactivate' ? 'danger' : 'primary'}
              disabled={busyId !== null}
              onClick={() => void runConfirmedAction()}
            >
              {confirmAction ? t(`${confirmAction.kind}.confirm`) : ''}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p>{confirmAction ? t(`${confirmAction.kind}.text`) : ''}</p>
          {confirmAction?.kind === 'deactivate' && (
            <div className="flex flex-col gap-1.5">
              <ReasonPicker
                id="deactivate-reason"
                kind="deactivate"
                label={t('deactivate.reason')}
                value={reason}
                onChange={setReason}
              />
              <span className="text-ink-muted text-[13px]">{t('deactivate.reasonHint')}</span>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
};

export default AdminCustomersPage;
