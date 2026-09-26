import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import AdminFarmerApi from '@/api-requests/admin-farmer.requests';
import { Button, ButtonLink } from '@/components/ui/button';
import { DataState } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { Pagination } from '@/components/ui/pagination';
import { Field } from '@/components/ui/input';
import { ReasonField } from '@/components/ReasonField';
import Tabs from '@/components/ui/tabs';
import { Table, type TableColumn } from '@/components/ui/table';
import { REASON_MAX } from '@/constants/approvalStatus';
import { ADMIN_FARMERS_PATH } from '@/constants/nav';
import { formatDate } from '@/lib/format';
import type { AdminFarmerListItemType, FarmerApproval } from '@/types/farmer.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

type Status =
  { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; items: AdminFarmerListItemType[]; total: number };

/** Docs/prototype/admin/farmers.html — tabs by approval status, each tab has its own empty content (`empty.<tab>`). */
const TABS: FarmerApproval[] = ['pending', 'approved', 'suspended', 'rejected'];

type ConfirmKind = 'approve' | 'suspend' | 'reinstate';
type ConfirmAction = { kind: ConfirmKind; item: AdminFarmerListItemType } | null;

/** Enough to see a whole screen without a long scroll; the rest goes to the next page. */
const PAGE_SIZE = 10;

/** The number of fake rows while waiting — equal to a full page so the frame does not jump when data arrives. */
const SKELETON_ROWS = 5;

/** Toast after an action finishes: `toast.<key>`. */
const DONE_TOAST = { approve: 'approved', suspend: 'suspended', reinstate: 'reinstated' } as const;

/** §6, §7, §8 — an Admin views, approves, rejects, suspends, reinstates a Farmer (FR-071/D-09). */
const AdminFarmersPage = () => {
  const { t } = useTranslation('AdminFarmers');
  const [activeTab, setActiveTab] = useState<FarmerApproval>('pending');
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [counts, setCounts] = useState<Partial<Record<FarmerApproval, number>>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminFarmerListItemType | null>(null);
  /** One reason used for both reject and suspend — only one dialog can be open at a time. */
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string>();
  /** The text being typed in the search box, separate from the applied keyword: only Enter or the button calls the API. */
  const [queryDraft, setQueryDraft] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  // only setState in a promise callback (the initial state is already loading)
  const fetchList = useCallback(() => {
    AdminFarmerApi.list({ status: activeTab, q: query || undefined, page, pageSize: PAGE_SIZE })
      .then((response) => setStatus({ kind: 'ready', items: response.data.items, total: response.data.total }))
      .catch(() => setStatus({ kind: 'error' }));
  }, [activeTab, query, page]);

  // The number on a tab must count within the current search scope, otherwise a tab says 5 while the table has only 1 row.
  const fetchCounts = useCallback(() => {
    Promise.all(TABS.map((tab) => AdminFarmerApi.list({ status: tab, q: query || undefined, page: 1, pageSize: 1 })))
      .then((responses) => {
        const next: Partial<Record<FarmerApproval, number>> = {};
        TABS.forEach((tab, i) => {
          next[tab] = responses[i]?.data.total;
        });
        setCounts(next);
      })
      .catch(() => {});
  }, [query]);

  useEffect(fetchList, [fetchList]);
  useEffect(fetchCounts, [fetchCounts]);

  // Changing tab, searching or going to another page is a fresh fetch each time: build the skeleton right away so the screen
  // does not sit still with old data while waiting.
  const changeTab = (tab: FarmerApproval) => {
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
    setReason('');
    setReasonError(undefined);
    setConfirmAction({ kind, item });
  };

  const runConfirmedAction = async () => {
    if (!confirmAction) return;
    const { kind, item } = confirmAction;
    const written = reason.trim();
    // Suspension needs a reason too: the Farmer reads this sentence back on their own profile page.
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
    // The server requires a reason (@NotBlank, at most 255) — block it here so the admin does not lose the dialog.
    const written = reason.trim();
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

  const columns: TableColumn<AdminFarmerListItemType>[] = [
    {
      // docs/prototype/admin/farmers.html: the stall name is a link, below it is "contact person · phone".
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
    { key: 'email', label: t('col.email') },
    { key: 'createdAt', label: t('col.registered'), render: (f) => formatDate(new Date(f.createdAt)) },
    {
      key: 'action',
      label: '',
      align: 'actions',
      render: (f) => {
        const busy = busyId === f.id;
        if (f.approvalStatus === 'pending') {
          return (
            <div className="flex justify-end gap-2">
              <Button size="sm" disabled={busy} onClick={() => openConfirm('approve', f)}>
                {t('action.approve')}
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={busy}
                onClick={() => {
                  setRejectTarget(f);
                  setReason('');
                  setReasonError(undefined);
                }}
              >
                {t('action.reject')}
              </Button>
            </div>
          );
        }
        if (f.approvalStatus === 'approved') {
          return (
            <div className="flex justify-end gap-2">
              <ButtonLink to={`${ADMIN_FARMERS_PATH}/${f.id}`} variant="secondary" size="sm">
                {t('action.view')}
              </ButtonLink>
              <Button variant="danger" size="sm" disabled={busy} onClick={() => openConfirm('suspend', f)}>
                {t('action.suspend')}
              </Button>
            </div>
          );
        }
        if (f.approvalStatus === 'suspended') {
          return (
            <div className="flex justify-end gap-2">
              <ButtonLink to={`${ADMIN_FARMERS_PATH}/${f.id}`} variant="secondary" size="sm">
                {t('action.view')}
              </ButtonLink>
              <Button size="sm" disabled={busy} onClick={() => openConfirm('reinstate', f)}>
                {t('action.reinstate')}
              </Button>
            </div>
          );
        }
        return (
          <Link to={`${ADMIN_FARMERS_PATH}/${f.id}`} className="text-brand underline">
            {t('action.view')}
          </Link>
        );
      },
    },
  ];

  return (
    // The shell's <main> is flex-col so flex-1 here takes all the remaining height — that way the
    // "no data" block grows to fill the free space instead of being a small box at the top.
    <div className="flex flex-1 flex-col gap-6">
      {/* docs/prototype/admin/farmers.html: the title on the left, the search box on the right in the same row. */}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">{t('title')}</h1>
          <p className="text-body max-w-160">{t('intro')}</p>
        </div>
        {/* The search box takes all the remaining space up to the right margin; too narrow and it drops to its own row. */}
        <form role="search" onSubmit={submitSearch} className="flex min-w-70 flex-1 items-end gap-2">
          {/* Field passes className down to the <input> tag, so the flexible part must be this wrapper. */}
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
        onChange={(id) => changeTab(id as FarmerApproval)}
        tabs={TABS.map((tab) => ({ id: tab, label: t(`status.${tab}`), count: counts[tab] }))}
      />

      {/* The skeleton is built to the exact shape of the table about to appear: same row height so it does not jerk when data arrives. */}
      {status.kind === 'loading' && (
        <div
          aria-busy="true"
          className="border-line-strong bg-surface-raised animate-pulse overflow-hidden rounded-md border-[1.5px]"
        >
          <span className="sr-only">{t('loading')}</span>
          <div className="border-line-strong border-b-[1.5px] p-3 px-4">
            <div className="bg-surface-sunken h-5 w-28 rounded-sm" />
          </div>
          <div className="bg-surface-sunken/60 border-line-strong flex gap-4 border-b-[1.5px] px-4 py-2.5">
            {['w-24', 'w-20', 'w-24', 'w-16'].map((w) => (
              <div key={w} className={`bg-surface-sunken h-3 rounded-sm ${w}`} />
            ))}
          </div>
          {Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <div key={i} className="border-line flex items-center gap-4 border-b px-4 py-3 last:border-b-0">
              <div className="flex flex-1 flex-col gap-1.5">
                <div className="bg-surface-sunken h-4 w-40 max-w-full rounded-sm" />
                <div className="bg-surface-sunken h-3 w-52 max-w-full rounded-sm" />
              </div>
              <div className="bg-surface-sunken hidden h-4 w-48 rounded-sm sm:block" />
              <div className="bg-surface-sunken hidden h-4 w-20 rounded-sm md:block" />
              <div className="bg-surface-sunken h-9 w-28 rounded-sm" />
            </div>
          ))}
        </div>
      )}

      {status.kind === 'error' && (
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

      {status.kind === 'ready' &&
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
          // The empty list is the only thing on the screen: let it take all the space and centre.
          <DataState fill title={t(`empty.${activeTab}.title`)} text={t(`empty.${activeTab}.text`)} />
        ))}

      <Dialog
        open={confirmAction !== null}
        title={confirmAction ? t(`${confirmAction.kind}.title`, { stall: confirmAction.item.stallName }) : ''}
        tone={confirmAction?.kind === 'suspend' ? 'danger' : undefined}
        onClose={() => setConfirmAction(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmAction(null)}>
              {t('notYet')}
            </Button>
            <Button variant={confirmAction?.kind === 'suspend' ? 'dangerFill' : 'primary'} onClick={runConfirmedAction}>
              {confirmAction ? t(`${confirmAction.kind}.confirm`) : ''}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p>{confirmAction ? t(`${confirmAction.kind}.text`) : ''}</p>
          {confirmAction?.kind === 'suspend' && (
            <ReasonField
              kind="suspend"
              value={reason}
              error={reasonError}
              onChange={(next) => {
                setReason(next);
                if (reasonError) setReasonError(undefined);
              }}
            />
          )}
        </div>
      </Dialog>

      <Dialog
        open={rejectTarget !== null}
        tone="danger"
        title={rejectTarget ? t('reject.title', { stall: rejectTarget.stallName }) : ''}
        onClose={() => setRejectTarget(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>
              {t('keepReviewing')}
            </Button>
            <Button variant="dangerFill" onClick={submitReject}>
              {t('reject.confirm')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p>{t('reject.text')}</p>
          <ReasonField
            kind="reject"
            value={reason}
            error={reasonError}
            onChange={(next) => {
              setReason(next);
              if (reasonError) setReasonError(undefined);
            }}
          />
        </div>
      </Dialog>
    </div>
  );
};

export default AdminFarmersPage;
