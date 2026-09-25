import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import AdminFarmerApi from '@/api-requests/admin-farmer.requests';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { DataState } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { SelectField } from '@/components/ui/input';
import { Table, type TableColumn } from '@/components/ui/table';
import { REJECT_REASONS } from '@/constants/approvalStatus';
import { ADMIN_FARMERS_PATH } from '@/constants/nav';
import { formatDate } from '@/lib/format';
import type { AdminFarmerListItemType, FarmerApproval } from '@/types/farmer.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

type Status =
  { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; items: AdminFarmerListItemType[]; total: number };

/** Docs/prototype/admin/farmers.html — tabs theo trạng thái duyệt, mỗi tab có nội dung empty riêng (`empty.<tab>`). */
const TABS: FarmerApproval[] = ['pending', 'approved', 'suspended', 'rejected'];

type ConfirmKind = 'approve' | 'suspend' | 'reinstate';
type ConfirmAction = { kind: ConfirmKind; item: AdminFarmerListItemType } | null;

/** Toast sau khi thao tác xong: `toast.<key>`. */
const DONE_TOAST = { approve: 'approved', suspend: 'suspended', reinstate: 'reinstated' } as const;

/** §6, §7, §8 — Admin xem, duyệt, từ chối, đình chỉ, phục hồi Farmer (FR-071/D-09). */
const AdminFarmersPage = () => {
  const { t } = useTranslation('AdminFarmers');
  const rejectReasons = REJECT_REASONS.map((key) => t(`reason.${key}`));
  const [activeTab, setActiveTab] = useState<FarmerApproval>('pending');
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [counts, setCounts] = useState<Partial<Record<FarmerApproval, number>>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminFarmerListItemType | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // chỉ setState trong callback của promise (trạng thái ban đầu đã là loading)
  const fetchList = useCallback(() => {
    AdminFarmerApi.list({ status: activeTab, page: 1, pageSize: 50 })
      .then((response) => setStatus({ kind: 'ready', items: response.data.items, total: response.data.total }))
      .catch(() => setStatus({ kind: 'error' }));
  }, [activeTab]);

  const fetchCounts = useCallback(() => {
    Promise.all(TABS.map((tab) => AdminFarmerApi.list({ status: tab, page: 1, pageSize: 1 })))
      .then((responses) => {
        const next: Partial<Record<FarmerApproval, number>> = {};
        TABS.forEach((tab, i) => {
          next[tab] = responses[i]?.data.total;
        });
        setCounts(next);
      })
      .catch(() => {});
  }, []);

  useEffect(fetchList, [fetchList]);
  useEffect(fetchCounts, [fetchCounts]);

  const changeTab = (tab: FarmerApproval) => {
    setActiveTab(tab);
    setStatus({ kind: 'loading' });
  };

  const retry = () => {
    setStatus({ kind: 'loading' });
    fetchList();
  };

  const reload = () => {
    fetchList();
    fetchCounts();
  };

  const runConfirmedAction = async () => {
    if (!confirmAction) return;
    const { kind, item } = confirmAction;
    setBusyId(item.id);
    setConfirmAction(null);
    try {
      if (kind === 'approve') await AdminFarmerApi.approve(item.id);
      if (kind === 'suspend') await AdminFarmerApi.suspend(item.id);
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
    setBusyId(rejectTarget.id);
    try {
      await AdminFarmerApi.reject(rejectTarget.id, rejectReason);
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
      key: 'stallName',
      label: t('col.stall'),
      render: (f) => (
        <Link to={`${ADMIN_FARMERS_PATH}/${f.id}`} className="text-brand underline">
          <b>{f.stallName}</b>
        </Link>
      ),
    },
    { key: 'contactPerson', label: t('col.contact') },
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
              <Button size="sm" disabled={busy} onClick={() => setConfirmAction({ kind: 'approve', item: f })}>
                {t('action.approve')}
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={busy}
                onClick={() => {
                  setRejectTarget(f);
                  setRejectReason(rejectReasons[0]);
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
              <Button
                variant="danger"
                size="sm"
                disabled={busy}
                onClick={() => setConfirmAction({ kind: 'suspend', item: f })}
              >
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
              <Button size="sm" disabled={busy} onClick={() => setConfirmAction({ kind: 'reinstate', item: f })}>
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body max-w-160">{t('intro')}</p>
      </div>

      <div role="group" aria-label={t('tabsLabel')} className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Chip key={tab} pressed={activeTab === tab} onClick={() => changeTab(tab)}>
            {t(`status.${tab}`)}
            {counts[tab] != null && <span className="text-ink-muted ml-1">({counts[tab]})</span>}
          </Chip>
        ))}
      </div>

      {status.kind === 'loading' && (
        <Card aria-busy="true" className="flex flex-col gap-3 p-6">
          <span className="sr-only">{t('loading')}</span>
          <div className="bg-surface-sunken h-6 w-60 max-w-full rounded-sm" />
          <div className="bg-surface-sunken h-40 w-full rounded-sm" />
        </Card>
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
          <Table caption={t('caption', { count: status.total })} columns={columns} rows={status.items} />
        ) : (
          <DataState title={t(`empty.${activeTab}.title`)} text={t(`empty.${activeTab}.text`)} />
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
            <Button variant={confirmAction?.kind === 'suspend' ? 'danger' : 'primary'} onClick={runConfirmedAction}>
              {confirmAction ? t(`${confirmAction.kind}.confirm`) : ''}
            </Button>
          </>
        }
      >
        <p>{confirmAction ? t(`${confirmAction.kind}.text`) : ''}</p>
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
            <Button variant="danger" onClick={submitReject}>
              {t('reject.confirm')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p>{t('reject.text')}</p>
          <SelectField
            id="reject-reason"
            label={t('reject.reason')}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            options={rejectReasons}
          />
        </div>
      </Dialog>
    </div>
  );
};

export default AdminFarmersPage;
