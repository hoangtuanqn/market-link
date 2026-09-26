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

/** Docs/prototype/admin/farmers.html — tabs theo trạng thái duyệt, mỗi tab có nội dung empty riêng (`empty.<tab>`). */
const TABS: FarmerApproval[] = ['pending', 'approved', 'suspended', 'rejected'];

type ConfirmKind = 'approve' | 'suspend' | 'reinstate';
type ConfirmAction = { kind: ConfirmKind; item: AdminFarmerListItemType } | null;

/** Đủ để nhìn hết một màn mà không phải cuộn dài; phần còn lại sang trang sau. */
const PAGE_SIZE = 10;

/** Số hàng giả trong lúc chờ — bằng một trang đầy thì khung không nhảy khi dữ liệu về. */
const SKELETON_ROWS = 5;

/** Toast sau khi thao tác xong: `toast.<key>`. */
const DONE_TOAST = { approve: 'approved', suspend: 'suspended', reinstate: 'reinstated' } as const;

/** §6, §7, §8 — Admin xem, duyệt, từ chối, đình chỉ, phục hồi Farmer (FR-071/D-09). */
const AdminFarmersPage = () => {
  const { t } = useTranslation('AdminFarmers');
  const [activeTab, setActiveTab] = useState<FarmerApproval>('pending');
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [counts, setCounts] = useState<Partial<Record<FarmerApproval, number>>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminFarmerListItemType | null>(null);
  /** Lý do dùng cho cả từ chối và đình chỉ — mỗi lúc chỉ mở được một hộp thoại. */
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string>();
  /** Chữ đang gõ trong ô tìm kiếm, tách khỏi từ khoá đã áp dụng: chỉ Enter hoặc nút mới gọi API. */
  const [queryDraft, setQueryDraft] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  // chỉ setState trong callback của promise (trạng thái ban đầu đã là loading)
  const fetchList = useCallback(() => {
    AdminFarmerApi.list({ status: activeTab, q: query || undefined, page, pageSize: PAGE_SIZE })
      .then((response) => setStatus({ kind: 'ready', items: response.data.items, total: response.data.total }))
      .catch(() => setStatus({ kind: 'error' }));
  }, [activeTab, query, page]);

  // Số trên tab phải đếm trong phạm vi đang tìm, nếu không thì tab ghi 5 mà bảng chỉ có 1 dòng.
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

  // Đổi tab, tìm kiếm hay sang trang khác đều là một lần fetch mới: dựng skeleton ngay để màn hình
  // không đứng yên với dữ liệu cũ trong lúc chờ.
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
    // Đình chỉ cũng phải có lý do: chính Farmer đọc lại câu này trên trang hồ sơ của họ.
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
    // Server bắt buộc reason (@NotBlank, tối đa 255) — chặn ở đây để admin không mất hộp thoại.
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
      // docs/prototype/admin/farmers.html: tên sạp là liên kết, dưới nó là "người liên hệ · điện thoại".
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
    // <main> của shell là flex-col nên flex-1 ở đây lấy hết chiều cao còn lại — nhờ vậy khối
    // "chưa có dữ liệu" nở ra đúng phần trống thay vì là một hộp nhỏ trên cùng.
    <div className="flex flex-1 flex-col gap-6">
      {/* docs/prototype/admin/farmers.html: tiêu đề bên trái, ô tìm kiếm bên phải cùng một hàng. */}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">{t('title')}</h1>
          <p className="text-body max-w-160">{t('intro')}</p>
        </div>
        {/* Ô tìm kiếm ăn hết chỗ trống còn lại cho tới lề phải; hẹp quá thì xuống hàng riêng. */}
        <form role="search" onSubmit={submitSearch} className="flex min-w-70 flex-1 items-end gap-2">
          {/* Field đưa className xuống thẻ <input>, nên chỗ co giãn phải là lớp bọc này. */}
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

      {/* Skeleton dựng theo đúng hình bảng sắp hiện: cùng chiều cao hàng nên không bị giật khi có dữ liệu. */}
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
          // Danh sách rỗng là thứ duy nhất trên màn: cho nó chiếm hết chỗ và căn giữa.
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
