import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import AdminFarmerApi from '@/api-requests/admin-farmer.requests';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { DataState } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { SelectField } from '@/components/ui/input';
import { Table, type TableColumn } from '@/components/ui/table';
import { ADMIN_FARMERS_PATH } from '@/constants/nav';
import { formatDate } from '@/lib/format';
import type { AdminFarmerListItemType, FarmerApproval } from '@/types/farmer.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

type Status =
  { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; items: AdminFarmerListItemType[]; total: number };

/** Docs/prototype/admin/farmers.html — tabs theo trạng thái duyệt, mỗi tab có nội dung empty riêng. */
const TABS: { value: FarmerApproval; label: string }[] = [
  { value: 'pending', label: 'Waiting for approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'rejected', label: 'Rejected' },
];

const EMPTY_COPY: Record<FarmerApproval, { title: string; text: string }> = {
  pending: {
    title: 'No registrations waiting',
    text: 'New Farmer applications arrive here for review before they can list products.',
  },
  approved: {
    title: 'No approved stalls',
    text: 'Approve a registration and the stall appears here, visible to customers.',
  },
  suspended: {
    title: 'No suspended stalls',
    text: 'A suspended stall is hidden from customers but finishes the orders it already has (D-09).',
  },
  rejected: {
    title: 'No rejected registrations',
    text: 'Rejected Farmers keep their account and can be told why.',
  },
};

const REJECT_REASONS = [
  'Details do not match the stall',
  'Market is full',
  'Could not reach the contact number',
  'Other',
];

type ConfirmKind = 'approve' | 'suspend' | 'reinstate';
type ConfirmAction = { kind: ConfirmKind; item: AdminFarmerListItemType } | null;

const CONFIRM_COPY: Record<ConfirmKind, { title: (stall: string) => string; body: string; confirm: string }> = {
  approve: {
    title: (stall) => `Approve ${stall}?`,
    body: 'The stall becomes visible to customers and can list products right away. The Farmer is notified.',
    confirm: 'Approve stall',
  },
  suspend: {
    title: (stall) => `Suspend ${stall}?`,
    body: 'All products are hidden and no new orders are accepted. Orders already placed continue so customers do not lose what they booked (D-09).',
    confirm: 'Suspend stall',
  },
  reinstate: {
    title: (stall) => `Reinstate ${stall}?`,
    body: 'Products become visible to customers again right away.',
    confirm: 'Reinstate stall',
  },
};

/** §6, §7, §8 — Admin xem, duyệt, từ chối, đình chỉ, phục hồi Farmer (FR-071/D-09). */
const AdminFarmersPage = () => {
  const [activeTab, setActiveTab] = useState<FarmerApproval>('pending');
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [counts, setCounts] = useState<Partial<Record<FarmerApproval, number>>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminFarmerListItemType | null>(null);
  const [rejectReason, setRejectReason] = useState(REJECT_REASONS[0]);

  // chỉ setState trong callback của promise (trạng thái ban đầu đã là loading)
  const fetchList = useCallback(() => {
    AdminFarmerApi.list({ status: activeTab, page: 1, pageSize: 50 })
      .then((response) => setStatus({ kind: 'ready', items: response.data.items, total: response.data.total }))
      .catch(() => setStatus({ kind: 'error' }));
  }, [activeTab]);

  const fetchCounts = useCallback(() => {
    Promise.all(TABS.map((t) => AdminFarmerApi.list({ status: t.value, page: 1, pageSize: 1 })))
      .then((responses) => {
        const next: Partial<Record<FarmerApproval, number>> = {};
        TABS.forEach((t, i) => {
          next[t.value] = responses[i]?.data.total;
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
      Notification.success({ text: `${item.stallName} ${kind === 'approve' ? 'approved' : kind + 'd'}.` });
      reload();
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, 'Could not complete that action. Please try again.') });
    } finally {
      setBusyId(null);
    }
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);
    try {
      await AdminFarmerApi.reject(rejectTarget.id, rejectReason);
      Notification.success({ text: `${rejectTarget.stallName} rejected. They keep their account.` });
      setRejectTarget(null);
      reload();
    } catch (error) {
      Notification.error({
        text: Helper.getErrorMessage(error, 'Could not reject this application. Please try again.'),
      });
    } finally {
      setBusyId(null);
    }
  };

  const columns: TableColumn<AdminFarmerListItemType>[] = [
    {
      key: 'stallName',
      label: 'Stall',
      render: (f) => (
        <Link to={`${ADMIN_FARMERS_PATH}/${f.id}`} className="text-brand underline">
          <b>{f.stallName}</b>
        </Link>
      ),
    },
    { key: 'contactPerson', label: 'Contact' },
    { key: 'email', label: 'Email' },
    { key: 'createdAt', label: 'Registered', render: (f) => formatDate(new Date(f.createdAt)) },
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
                Approve
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={busy}
                onClick={() => {
                  setRejectTarget(f);
                  setRejectReason(REJECT_REASONS[0]);
                }}
              >
                Reject
              </Button>
            </div>
          );
        }
        if (f.approvalStatus === 'approved') {
          return (
            <div className="flex justify-end gap-2">
              <ButtonLink to={`${ADMIN_FARMERS_PATH}/${f.id}`} variant="secondary" size="sm">
                View
              </ButtonLink>
              <Button
                variant="danger"
                size="sm"
                disabled={busy}
                onClick={() => setConfirmAction({ kind: 'suspend', item: f })}
              >
                Suspend
              </Button>
            </div>
          );
        }
        if (f.approvalStatus === 'suspended') {
          return (
            <div className="flex justify-end gap-2">
              <ButtonLink to={`${ADMIN_FARMERS_PATH}/${f.id}`} variant="secondary" size="sm">
                View
              </ButtonLink>
              <Button size="sm" disabled={busy} onClick={() => setConfirmAction({ kind: 'reinstate', item: f })}>
                Reinstate
              </Button>
            </div>
          );
        }
        return (
          <Link to={`${ADMIN_FARMERS_PATH}/${f.id}`} className="text-brand underline">
            View
          </Link>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">Farmers</h1>
        <p className="text-body max-w-160">
          Approve an application before the stall can list products. Suspend a stall to hide its products and stop new
          orders; its running orders finish as normal (D-09).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Chip key={t.value} pressed={activeTab === t.value} onClick={() => changeTab(t.value)}>
            {t.label}
            {counts[t.value] != null && <span className="text-ink-muted ml-1">({counts[t.value]})</span>}
          </Chip>
        ))}
      </div>

      {status.kind === 'loading' && (
        <Card aria-busy="true" className="flex flex-col gap-3 p-6">
          <span className="sr-only">Loading farmers</span>
          <div className="bg-surface-sunken h-6 w-60 max-w-full rounded-sm" />
          <div className="bg-surface-sunken h-40 w-full rounded-sm" />
        </Card>
      )}

      {status.kind === 'error' && (
        <DataState
          variant="error"
          title="Couldn't load farmers"
          text="Check your connection and try again."
          action={
            <Button variant="secondary" size="sm" onClick={retry}>
              Try again
            </Button>
          }
        />
      )}

      {status.kind === 'ready' &&
        (status.items.length ? (
          <Table
            caption={`${status.total} farmer${status.total === 1 ? '' : 's'}`}
            columns={columns}
            rows={status.items}
          />
        ) : (
          <DataState title={EMPTY_COPY[activeTab].title} text={EMPTY_COPY[activeTab].text} />
        ))}

      <Dialog
        open={confirmAction !== null}
        title={confirmAction ? CONFIRM_COPY[confirmAction.kind].title(confirmAction.item.stallName) : ''}
        tone={confirmAction?.kind === 'suspend' ? 'danger' : undefined}
        onClose={() => setConfirmAction(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmAction(null)}>
              Not yet
            </Button>
            <Button variant={confirmAction?.kind === 'suspend' ? 'danger' : 'primary'} onClick={runConfirmedAction}>
              {confirmAction ? CONFIRM_COPY[confirmAction.kind].confirm : ''}
            </Button>
          </>
        }
      >
        <p>{confirmAction ? CONFIRM_COPY[confirmAction.kind].body : ''}</p>
      </Dialog>

      <Dialog
        open={rejectTarget !== null}
        tone="danger"
        title={rejectTarget ? `Reject ${rejectTarget.stallName}?` : ''}
        onClose={() => setRejectTarget(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>
              Keep reviewing
            </Button>
            <Button variant="danger" onClick={submitReject}>
              Reject application
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p>The applicant keeps their customer account and everything in it. They are told the reason.</p>
          <SelectField
            id="reject-reason"
            label="Reason the applicant will see"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            options={REJECT_REASONS}
          />
        </div>
      </Dialog>
    </div>
  );
};

export default AdminFarmersPage;
