import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import AdminFarmerApi from '@/api-requests/admin-farmer.requests';
import Avatar from '@/components/Avatar';
import { Button } from '@/components/ui/button';
import { DataState } from '@/components/ui/data-state';
import { Field } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import Tabs from '@/components/ui/tabs';
import { Table, type TableColumn } from '@/components/ui/table';
import { REASON_MAX } from '@/constants/approvalStatus';
import { ADMIN_FARMERS_PATH } from '@/constants/nav';
import { formatDate } from '@/lib/format';
import { composeReason, emptyReason, type ReasonValue } from '@/lib/reasons';
import type { AdminFarmerListItemType } from '@/types/farmer.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';
import ConfirmActionDialog from './ConfirmActionDialog';
import {
  DONE_TOAST,
  PAGE_SIZE,
  TABS,
  type ConfirmAction,
  type ConfirmKind,
  type FarmerTab,
  type Status,
} from './constants';
import FarmerActions from './FarmerActions';
import FarmerTableSkeleton from './FarmerTableSkeleton';
import RejectDialog from './RejectDialog';

const AdminFarmersPage = () => {
  const { t } = useTranslation('AdminFarmers');
  const [activeTab, setActiveTab] = useState<FarmerTab>('all');
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [counts, setCounts] = useState<Partial<Record<FarmerTab, number>>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminFarmerListItemType | null>(null);
  const [reason, setReason] = useState<ReasonValue>(emptyReason);
  const [reasonError, setReasonError] = useState<string>();
  const [queryDraft, setQueryDraft] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [initialLoading, setInitialLoading] = useState(import.meta.env.MODE !== 'test');

  useEffect(() => {
    if (import.meta.env.MODE === 'test') return;
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const fetchList = useCallback(() => {
    AdminFarmerApi.list({ status: activeTab, q: query || undefined, page, pageSize: PAGE_SIZE })
      .then((response) => setStatus({ kind: 'ready', items: response.data.items, total: response.data.total }))
      .catch(() => setStatus({ kind: 'error' }));
  }, [activeTab, query, page]);

  const fetchCounts = useCallback(() => {
    Promise.all(TABS.map((tab) => AdminFarmerApi.list({ status: tab, q: query || undefined, page: 1, pageSize: 1 })))
      .then((responses) => {
        const next: Partial<Record<FarmerTab, number>> = {};
        TABS.forEach((tab, i) => {
          next[tab] = responses[i]?.data.total;
        });
        setCounts(next);
      })
      .catch(() => {});
  }, [query]);

  useEffect(fetchList, [fetchList]);
  useEffect(fetchCounts, [fetchCounts]);

  const changeTab = (tab: FarmerTab) => {
    if (tab === activeTab) return;
    setStatus({ kind: 'loading' });
    setActiveTab(tab);
    setPage(1);
  };

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    setStatus({ kind: 'loading' });
    setQuery(queryDraft.trim());
    setPage(1);
  };

  const goToPage = (next: number) => {
    if (next === page) return;
    setStatus({ kind: 'loading' });
    setPage(next);
  };

  const retry = () => {
    setStatus({ kind: 'loading' });
    fetchList();
  };

  const reload = () => {
    fetchList();
    fetchCounts();
  };

  const openConfirm = (kind: ConfirmKind, item: AdminFarmerListItemType) => {
    setReason(emptyReason());
    setReasonError(undefined);
    setConfirmAction({ kind, item });
  };

  const runConfirmedAction = async () => {
    if (!confirmAction) return;
    const { kind, item } = confirmAction;
    const written = composeReason('suspend', reason);
    if (kind === 'suspend') {
      if (!written) return setReasonError(t('suspend.required'));
      if (written.length > REASON_MAX) return setReasonError(t('suspend.tooLong', { max: REASON_MAX }));
      setReasonError(undefined);
    }
    setBusyId(item.id);
    setConfirmAction(null);
    try {
      if (kind === 'approve') await AdminFarmerApi.approve(item.id);
      if (kind === 'suspend') await AdminFarmerApi.suspend(item.id, written);
      if (kind === 'reinstate') await AdminFarmerApi.reinstate(item.id);
      Notification.success({ text: t(`toast.${DONE_TOAST[kind]}`, { stall: item.stallName }) });
      reload();
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, t('toast.failed')) });
    } finally {
      setBusyId(null);
    }
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    const written = composeReason('reject', reason);
    if (!written) return setReasonError(t('reject.required'));
    if (written.length > REASON_MAX) return setReasonError(t('reject.tooLong', { max: REASON_MAX }));
    setReasonError(undefined);
    setBusyId(rejectTarget.id);
    try {
      await AdminFarmerApi.reject(rejectTarget.id, written);
      Notification.success({ text: t('toast.rejected', { stall: rejectTarget.stallName }) });
      setRejectTarget(null);
      reload();
    } catch (error) {
      Notification.error({
        text: Helper.getErrorMessage(error, t('toast.rejectFailed')),
      });
    } finally {
      setBusyId(null);
    }
  };

  const openReject = (f: AdminFarmerListItemType) => {
    setRejectTarget(f);
    setReason(emptyReason());
    setReasonError(undefined);
  };

  const onReasonChange = (next: ReasonValue) => {
    setReason(next);
    if (reasonError) setReasonError(undefined);
  };

  const columns: TableColumn<AdminFarmerListItemType>[] = [
    {
      key: 'stallName',
      label: t('col.stall'),
      render: (f) => (
        <div className="flex flex-col">
          <Link to={`${ADMIN_FARMERS_PATH}/${f.id}`} className="text-brand underline">
            <b>{f.stallName}</b>
          </Link>
          <span className="text-ink-muted text-[13px]">
            {f.contactPerson} · {f.phone}
          </span>
        </div>
      ),
    },
    {
      key: 'email',
      label: t('col.email'),
      render: (f) => (
        <div className="flex items-center gap-3">
          <Avatar
            name={f.contactPerson || f.stallName}
            email={f.email}
            url={f.avatarUrl ?? undefined}
            size={36}
            className="shrink-0"
          />
          <span className="truncate">{f.email}</span>
        </div>
      ),
    },
    { key: 'createdAt', label: t('col.registered'), render: (f) => formatDate(new Date(f.createdAt)) },
    {
      key: 'action',
      label: '',
      align: 'actions',
      render: (f) => <FarmerActions farmer={f} busy={busyId === f.id} onConfirm={openConfirm} onReject={openReject} />,
    },
  ];

  const showSkeleton = status.kind === 'loading' || initialLoading;

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
              id="farmer-q"
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
        label={t('tabsLabel')}
        value={activeTab}
        onChange={(id) => changeTab(id as FarmerTab)}
        tabs={TABS.map((tab) => ({ id: tab, label: t(`status.${tab}`), count: counts[tab] }))}
      />

      {showSkeleton && <FarmerTableSkeleton />}

      {!showSkeleton && status.kind === 'error' && (
        <DataState
          variant="error"
          title={t('loadError.title')}
          text={t('loadError.text')}
          action={
            <Button variant="secondary" size="sm" onClick={retry}>
              {t('loadError.retry')}
            </Button>
          }
        />
      )}

      {!showSkeleton &&
        status.kind === 'ready' &&
        (status.items.length ? (
          <div className="flex flex-col gap-4">
            <Table caption={t('caption', { count: status.total })} columns={columns} rows={status.items} />
            {status.total > PAGE_SIZE && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-small text-ink-muted">
                  {t('showing', {
                    from: (page - 1) * PAGE_SIZE + 1,
                    to: (page - 1) * PAGE_SIZE + status.items.length,
                    total: status.total,
                  })}
                </span>
                <Pagination page={page} pages={Math.ceil(status.total / PAGE_SIZE)} onChange={goToPage} />
              </div>
            )}
          </div>
        ) : (
          <DataState fill title={t(`empty.${activeTab}.title`)} text={t(`empty.${activeTab}.text`)} />
        ))}

      <ConfirmActionDialog
        action={confirmAction}
        reason={reason}
        reasonError={reasonError}
        onReasonChange={onReasonChange}
        onClose={() => setConfirmAction(null)}
        onConfirm={runConfirmedAction}
      />

      <RejectDialog
        target={rejectTarget}
        reason={reason}
        reasonError={reasonError}
        onReasonChange={onReasonChange}
        onClose={() => setRejectTarget(null)}
        onConfirm={submitReject}
      />
    </div>
  );
};

export default AdminFarmersPage;
