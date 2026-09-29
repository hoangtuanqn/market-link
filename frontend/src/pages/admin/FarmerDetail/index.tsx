import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router';
import AskAssistant from '@/components/assistant/AskAssistant';
import AdminFarmerApi, { type AdminFarmerStatusHistoryDto } from '@/api-requests/admin-farmer.requests';
import { Banner } from '@/components/ui/banner';
import BanDurationPicker, { type BanDuration } from '@/components/BanDurationPicker';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataState, LoadError } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { Table, type TableColumn } from '@/components/ui/table';
import { ApplicationHistory } from '@/components/ApplicationHistory';
import { ReasonField } from '@/components/ReasonField';
import { VideoThumb } from '@/components/VideoThumb';
import { APPROVAL_STATUS_META, REASON_MAX } from '@/constants/approvalStatus';
import { composeReason, emptyReason, isReasonCode, type ReasonValue } from '@/lib/reasons';
import { STRIKE_WINDOW_DAYS, STRIKES_TO_LOCK } from '@/lib/spoilage';
import { ORDER_STATUS_META } from '@/constants/orderStatus';
import { ADMIN_FARMERS_PATH } from '@/constants/nav';
import { cutoffLabel, formatDate } from '@/lib/format';
import useRequest from '@/hooks/useRequest';
import type { AdminFarmerDetailType } from '@/types/farmer.types';
import type { OrderStatus } from '@/types/order.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';
import FarmerDetailSkeleton from './FarmerDetailSkeleton';

type Status = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; data: AdminFarmerDetailType };
type DialogKind = 'approve' | 'reject' | 'suspend' | 'reinstate';

type HistoryKey = 'suspended' | 'approved' | 'sent' | 'customer';

const DONE_TOAST = { approve: 'approved', reject: 'rejected', suspend: 'suspended', reinstate: 'reinstated' } as const;

const fileUrl = (path: string) => `${import.meta.env.VITE_API_URL ?? 'http://localhost:8080'}${path}`;

const AdminFarmerDetailPage = () => {
  const { t } = useTranslation('AdminFarmerDetail');
  const { t: tAssistant } = useTranslation('common');
  const { t: tf } = useTranslation('AdminFarmers');
  const { id } = useParams<{ id: string }>();
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [reason, setReason] = useState<ReasonValue>(emptyReason);
  const [reasonError, setReasonError] = useState<string>();
  const [searchParams, setSearchParams] = useSearchParams();
  const presetSuspend = useRef(searchParams.get('suspend'));
  const setSearchParamsRef = useRef(setSearchParams);
  useEffect(() => {
    setSearchParamsRef.current = setSearchParams;
  }, [setSearchParams]);
  const [duration, setDuration] = useState<BanDuration>({ kind: 'permanent' });
  const [initialLoading, setInitialLoading] = useState(import.meta.env.MODE !== 'test');

  const { state: historyLoad, retry: retryHistory } = useRequest(`admin-farmer-history:${id}`, () =>
    id ? AdminFarmerApi.statusHistory(Number(id), 1, 20) : Promise.reject(new Error('not a farmer id')),
  );

  useEffect(() => {
    if (import.meta.env.MODE === 'test') return;
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const fetchDetail = useCallback(() => {
    AdminFarmerApi.detail(Number(id))
      .then((response) => {
        setStatus({ kind: 'ready', data: response.data });
        const code = presetSuspend.current;
        presetSuspend.current = null;
        if (code && isReasonCode('suspend', code)) {
          setSearchParamsRef.current(
            (prev) => {
              const next = new URLSearchParams(prev);
              next.delete('suspend');
              return next;
            },
            { replace: true },
          );
          if (response.data.approvalStatus === 'approved') {
            setReason({ codes: [code], note: '' });
            setReasonError(undefined);
            setDialog('suspend');
          }
        }
      })
      .catch(() => setStatus({ kind: 'error' }));
  }, [id]);

  useEffect(fetchDetail, [fetchDetail]);

  const load = () => {
    setStatus({ kind: 'loading' });
    fetchDetail();
  };

  const openDialog = (kind: DialogKind) => {
    setReason(emptyReason());
    setReasonError(undefined);
    setDuration({ kind: 'permanent' });
    setDialog(kind);
  };

  const historyOf = (f: AdminFarmerDetailType) => {
    const entries: { key: HistoryKey; status: OrderStatus; at: string; by: string }[] = [];
    if (f.approvedAt) {
      entries.push({ key: 'approved', status: 'completed', at: f.approvedAt, by: t('history.byAdmin') });
    }
    if (f.suspendedAt) {
      entries.push({ key: 'suspended', status: 'declined', at: f.suspendedAt, by: t('history.byAdmin') });
    }
    entries.push({ key: 'sent', status: 'placed', at: f.createdAt, by: f.contactPerson });
    entries.push({ key: 'customer', status: 'accepted', at: f.customerSince, by: f.contactPerson });
    return entries;
  };

  const confirmDialog = async () => {
    if (!dialog) return;
    const written = dialog === 'reject' || dialog === 'suspend' ? composeReason(dialog, reason) : '';
    if (dialog === 'reject' || dialog === 'suspend') {
      if (!written) return setReasonError(tf(`${dialog}.required`));
      if (written.length > REASON_MAX) return setReasonError(tf(`${dialog}.tooLong`, { max: REASON_MAX }));
      setReasonError(undefined);
    }
    const until = dialog === 'suspend' && duration.kind === 'temporary' ? duration.until : null;
    setBusy(true);
    try {
      const response =
        dialog === 'approve'
          ? await AdminFarmerApi.approve(Number(id))
          : dialog === 'reject'
            ? await AdminFarmerApi.reject(Number(id), written)
            : dialog === 'suspend'
              ? await AdminFarmerApi.suspend(Number(id), written, until)
              : await AdminFarmerApi.reinstate(Number(id));
      setStatus({ kind: 'ready', data: response.data });
      setDialog(null);
      if (dialog === 'suspend' || dialog === 'reinstate') retryHistory();
      Notification.success({ text: tf(`toast.${DONE_TOAST[dialog]}`, { stall: response.data.stallName }) });
    } catch (error) {
      Notification.error({
        text: Helper.getErrorMessage(error, tf('toast.failed')),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="text-small text-ink-muted">
        <Link to={ADMIN_FARMERS_PATH} className="text-brand underline">
          {tf('title')}
        </Link>{' '}
        · {t('breadcrumb')}
      </p>

      {(status.kind === 'loading' || initialLoading) && <FarmerDetailSkeleton />}

      {!(status.kind === 'loading' || initialLoading) && status.kind === 'error' && (
        <DataState
          variant="error"
          title={t('loadError.title')}
          text={t('loadError.text')}
          action={
            <Button variant="secondary" size="sm" onClick={load}>
              {t('loadError.retry')}
            </Button>
          }
        />
      )}

      {!(status.kind === 'loading' || initialLoading) &&
        status.kind === 'ready' &&
        (() => {
          const f = status.data;
          const meta = APPROVAL_STATUS_META[f.approvalStatus];
          const Icon = meta.icon;
          return (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <p className="text-overline text-ink-muted uppercase">
                    {t('sentOn', { date: formatDate(new Date(f.createdAt)) })}
                  </p>
                  <div className="flex items-center gap-4">
                    <h1 className="text-h1 text-ink font-bold">{f.stallName}</h1>
                    <AskAssistant
                      question={tAssistant('assistant.ask.application')}
                      record={{ type: 'farmer', ref: String(f.id) }}
                    />
                    <span
                      className={Helper.cn(
                        'inline-flex w-fit items-center gap-1 rounded-full py-0.75 pr-2.5 pl-2 text-[13px] leading-4.5 font-bold',
                        meta.className,
                      )}
                    >
                      <Icon size={14} />
                      {tf(`status.${f.approvalStatus}`)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {f.approvalStatus === 'pending' && (
                    <>
                      <Button variant="danger" disabled={busy} onClick={() => openDialog('reject')}>
                        {tf('action.reject')}
                      </Button>
                      <Button disabled={busy} onClick={() => openDialog('approve')}>
                        {tf('approve.confirm')}
                      </Button>
                    </>
                  )}
                  {f.approvalStatus === 'approved' && (
                    <Button variant="danger" disabled={busy} onClick={() => openDialog('suspend')}>
                      {tf('action.suspend')}
                    </Button>
                  )}
                  {f.approvalStatus === 'suspended' && (
                    <Button disabled={busy} onClick={() => openDialog('reinstate')}>
                      {tf('action.reinstate')}
                    </Button>
                  )}
                </div>
              </div>

              {f.approvalStatus === 'suspended' && (
                <Banner variant="warning" title={t('suspendedBanner.title')}>
                  {f.suspendReason ?? t('suspendedBanner.text')}
                </Banner>
              )}

              {f.approvalStatus === 'rejected' && f.rejectReason && (
                <Banner variant="danger" title={t('rejectedBanner.title')}>
                  {t('rejectedBanner.text', { reason: f.rejectReason })}
                </Banner>
              )}

              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="flex flex-col gap-8">
                  {(!!f.photoUrls?.length || f.videoUrl) && (
                    <section className="flex flex-col gap-3">
                      <h2 className="text-h2">{t('photos.title')}</h2>
                      <div className="flex flex-wrap gap-2">
                        {f.photoUrls?.map((url) => (
                          <a key={url} href={fileUrl(url)} target="_blank" rel="noreferrer">
                            <img
                              src={fileUrl(url)}
                              alt={t('photos.alt')}
                              className="border-line-strong size-28 rounded-sm border-[1.5px] object-cover"
                            />
                          </a>
                        ))}
                        {f.videoUrl && <VideoThumb url={f.videoUrl} className="size-28" />}
                      </div>
                      <p className="text-small text-ink-muted">{t('photos.hint')}</p>
                    </section>
                  )}

                  <section className="flex flex-col gap-3">
                    <h2 className="text-h2">{t('stall.title')}</h2>
                    <Card className="p-6">
                      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
                        <dt className="text-ink-muted">{t('stall.name')}</dt>
                        <dd className="m-0">{f.stallName}</dd>
                        <dt className="text-ink-muted">{t('stall.contact')}</dt>
                        <dd className="m-0">
                          {f.contactPerson} · {f.phone}
                        </dd>
                        <dt className="text-ink-muted">{t('stall.email')}</dt>
                        <dd className="m-0">{f.email}</dd>
                        {f.description && (
                          <>
                            <dt className="text-ink-muted">{t('stall.description')}</dt>
                            <dd className="m-0">{f.description}</dd>
                          </>
                        )}
                      </dl>
                    </Card>
                  </section>

                  {f.history.length > 0 && (
                    <section className="flex flex-col gap-3">
                      <h2 className="text-h2">{t('attempts.title')}</h2>
                      <p className="text-small text-ink-muted">{t('attempts.text')}</p>
                      <ApplicationHistory entries={f.history} statusLabel={(s) => tf(`status.${s}`)} />
                    </section>
                  )}

                  <section className="flex flex-col gap-3">
                    <h2 className="text-h2">{t('history.title')}</h2>
                    <ol className="m-0 flex flex-col p-0">
                      {historyOf(f).map((entry, i) => {
                        const meta = ORDER_STATUS_META[entry.status];
                        const Icon = meta.icon;
                        return (
                          <li key={entry.key} className="relative grid grid-cols-[28px_1fr] items-start gap-3 py-2">
                            {i > 0 && (
                              <span
                                aria-hidden="true"
                                className="border-line-strong absolute -top-2 left-3.25 h-4 border-l-2 border-dotted"
                              />
                            )}
                            <span className={`grid size-7 flex-none place-items-center rounded-full ${meta.className}`}>
                              <Icon size={14} />
                            </span>
                            <div>
                              <b className="text-[15px]">{t(`history.${entry.key}`)}</b>
                              <time className="text-ink-muted mt-0.5 block text-[13px]">
                                {formatDate(new Date(entry.at))} · {entry.by}
                              </time>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </section>

                  <section className="flex flex-col gap-3">
                    <h2 className="text-h2">{t('statusHistory.title')}</h2>
                    {historyLoad.kind === 'loading' ? (
                      <div className="border-line-strong bg-surface-raised min-h-[140px] w-full animate-pulse rounded-md border-[1.5px] p-6" />
                    ) : historyLoad.kind === 'error' ? (
                      <LoadError noun={t('statusHistory.noun')} onRetry={retryHistory} />
                    ) : historyLoad.data.items.length ? (
                      <Table
                        columns={
                          [
                            {
                              key: 'when',
                              label: t('statusHistory.col.when'),
                              render: (h) => cutoffLabel(h.changedAt),
                            },
                            {
                              key: 'action',
                              label: t('statusHistory.col.action'),
                              render: (h) => t(`statusHistory.action.${h.toStatus}` as never),
                            },
                            {
                              key: 'reason',
                              label: t('statusHistory.col.reason'),
                              render: (h) => h.reason ?? '—',
                            },
                            {
                              key: 'until',
                              label: t('statusHistory.col.until'),
                              render: (h) => (h.until ? cutoffLabel(h.until) : '—'),
                            },
                            {
                              key: 'by',
                              label: t('statusHistory.col.by'),
                              render: (h) => h.changedByName ?? t('statusHistory.system'),
                            },
                          ] satisfies TableColumn<AdminFarmerStatusHistoryDto>[]
                        }
                        rows={historyLoad.data.items}
                      />
                    ) : (
                      <DataState
                        center
                        title={t('statusHistory.empty.title')}
                        text={t('statusHistory.empty.text')}
                        className="min-h-[140px] w-full max-w-none py-6"
                      />
                    )}
                  </section>
                </div>

                <aside className="flex flex-col gap-4">
                  <Card className="flex flex-col gap-3 p-6">
                    <h2 className="text-h3">{t('applicant.title')}</h2>
                    <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
                      <dt className="text-ink-muted">{t('applicant.name')}</dt>
                      <dd className="m-0">{f.contactPerson}</dd>
                      <dt className="text-ink-muted">{t('applicant.since')}</dt>
                      <dd className="m-0">{formatDate(new Date(f.customerSince))}</dd>
                      <dt className="text-ink-muted">{t('applicant.status')}</dt>
                      <dd className="m-0">{t(`accountStatus.${f.accountStatus}`)}</dd>
                    </dl>
                  </Card>

                  <Card className="flex flex-col gap-2 p-6">
                    <h2 className="text-h3">{t('strikes.title')}</h2>
                    <p className="text-[15px] font-bold">
                      {t('strikes.count', {
                        count: f.activeViolations,
                        limit: STRIKES_TO_LOCK,
                        days: STRIKE_WINDOW_DAYS,
                      })}
                    </p>
                    <p className="text-small">
                      {f.extensionLockedUntil
                        ? t('strikes.locked', { date: formatDate(new Date(f.extensionLockedUntil)) })
                        : t('strikes.clear')}
                    </p>
                    <p className="text-small text-ink-muted">{t('strikes.text')}</p>
                  </Card>

                  <Card className="flex flex-col gap-2 p-6">
                    <h3 className="text-h3">{t('approval.title')}</h3>
                    <p className="text-small">{t('approval.text')}</p>
                  </Card>
                </aside>
              </div>
            </>
          );
        })()}

      <Dialog
        open={dialog !== null}
        tone={dialog === 'reject' || dialog === 'suspend' ? 'danger' : undefined}
        title={dialog && status.kind === 'ready' ? tf(`${dialog}.title`, { stall: status.data.stallName }) : ''}
        onClose={() => setDialog(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)} disabled={busy}>
              {dialog === 'reject' ? tf('keepReviewing') : tf('notYet')}
            </Button>
            <Button
              variant={dialog === 'reject' || dialog === 'suspend' ? 'dangerFill' : 'primary'}
              onClick={confirmDialog}
              disabled={busy}
            >
              {dialog ? tf(`${dialog}.confirm`) : ''}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p>{dialog === 'approve' ? t('approveText') : dialog ? tf(`${dialog}.text`) : ''}</p>
          {dialog === 'suspend' && <BanDurationPicker value={duration} onChange={setDuration} />}
          {(dialog === 'reject' || dialog === 'suspend') && (
            <ReasonField
              kind={dialog}
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
    </div>
  );
};

export default AdminFarmerDetailPage;
