import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import AdminFarmerApi from '@/api-requests/admin-farmer.requests';
import MapPlaceholder from '@/components/MapPlaceholder';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataState } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { SelectField } from '@/components/ui/input';
import { APPROVAL_STATUS_META } from '@/constants/approvalStatus';
import { ADMIN_FARMERS_PATH } from '@/constants/nav';
import { formatDate } from '@/lib/format';
import type { AdminFarmerDetailType } from '@/types/farmer.types';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

type Status = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; data: AdminFarmerDetailType };
type DialogKind = 'approve' | 'reject' | 'suspend' | 'reinstate';

const REJECT_REASONS = [
  'Details do not match the stall',
  'Market is full',
  'Could not reach the contact number',
  'Other',
];

const DIALOG_COPY: Record<DialogKind, { title: (stall: string) => string; body: string; confirm: string }> = {
  approve: {
    title: (stall) => `Approve ${stall}?`,
    body: 'Their role becomes Farmer and a stall panel opens on their account. They keep every customer feature they have now. Nothing appears to shoppers until they add products and set a pickup window.',
    confirm: 'Approve stall',
  },
  reject: {
    title: (stall) => `Reject ${stall}?`,
    body: 'The applicant keeps the customer account and everything in it. They are told the reason.',
    confirm: 'Reject application',
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

const fileUrl = (path: string) => `${import.meta.env.VITE_API_URL ?? 'http://localhost:8080'}${path}`;

/** §6.2, §7, §8 — Admin xem chi tiết một đơn xin thành Farmer, duyệt/từ chối/đình chỉ/phục hồi. */
const AdminFarmerDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [rejectReason, setRejectReason] = useState(REJECT_REASONS[0]);

  // chỉ setState trong callback của promise (trạng thái ban đầu đã là loading)
  const fetchDetail = useCallback(() => {
    AdminFarmerApi.detail(Number(id))
      .then((response) => setStatus({ kind: 'ready', data: response.data }))
      .catch(() => setStatus({ kind: 'error' }));
  }, [id]);

  useEffect(fetchDetail, [fetchDetail]);

  const load = () => {
    setStatus({ kind: 'loading' });
    fetchDetail();
  };

  const openDialog = (kind: DialogKind) => {
    setRejectReason(REJECT_REASONS[0]);
    setDialog(kind);
  };

  const confirmDialog = async () => {
    if (!dialog) return;
    setBusy(true);
    try {
      const response =
        dialog === 'approve'
          ? await AdminFarmerApi.approve(Number(id))
          : dialog === 'reject'
            ? await AdminFarmerApi.reject(Number(id), rejectReason)
            : dialog === 'suspend'
              ? await AdminFarmerApi.suspend(Number(id))
              : await AdminFarmerApi.reinstate(Number(id));
      setStatus({ kind: 'ready', data: response.data });
      setDialog(null);
      const messages: Record<DialogKind, string> = {
        approve: `${response.data.stallName} approved. The stall can list products now.`,
        reject: `${response.data.stallName} rejected. They keep their account.`,
        suspend: `${response.data.stallName} suspended. Running orders finish as normal.`,
        reinstate: `${response.data.stallName} reinstated. Products are visible again.`,
      };
      Notification.success({ text: messages[dialog] });
    } catch (error) {
      Notification.error({
        text: Helper.getErrorMessage(error, 'Could not complete that action. Please try again.'),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="text-small text-ink-muted">
        <Link to={ADMIN_FARMERS_PATH} className="text-brand underline">
          Farmers
        </Link>{' '}
        · Application
      </p>

      {status.kind === 'loading' && (
        <Card aria-busy="true" className="flex flex-col gap-3 p-6">
          <span className="sr-only">Loading application</span>
          <div className="bg-surface-sunken h-6 w-60 max-w-full rounded-sm" />
          <div className="bg-surface-sunken h-32 w-full rounded-sm" />
        </Card>
      )}

      {status.kind === 'error' && (
        <DataState
          variant="error"
          title="Couldn't load this application"
          text="Check your connection and try again."
          action={
            <Button variant="secondary" size="sm" onClick={load}>
              Try again
            </Button>
          }
        />
      )}

      {status.kind === 'ready' &&
        (() => {
          const f = status.data;
          const meta = APPROVAL_STATUS_META[f.approvalStatus];
          const Icon = meta.icon;
          const hasPlot = f.plotAddress || f.plotSize || f.growingSinceYear || f.plotLatitude != null;
          const hasGrows = !!f.categories?.length || f.mainCrops || f.weeklyVolume || f.growingMethod;

          return (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <p className="text-overline text-ink-muted uppercase">Sent {formatDate(new Date(f.createdAt))}</p>
                  <h1 className="text-h1">{f.stallName}</h1>
                  <span
                    className={Helper.cn(
                      'inline-flex w-fit items-center gap-1 rounded-full py-0.75 pr-2.5 pl-2 text-[13px] leading-4.5 font-bold',
                      meta.className,
                    )}
                  >
                    <Icon size={14} />
                    {meta.label}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {f.approvalStatus === 'pending' && (
                    <>
                      <Button variant="danger" disabled={busy} onClick={() => openDialog('reject')}>
                        Reject
                      </Button>
                      <Button disabled={busy} onClick={() => openDialog('approve')}>
                        Approve stall
                      </Button>
                    </>
                  )}
                  {f.approvalStatus === 'approved' && (
                    <Button variant="danger" disabled={busy} onClick={() => openDialog('suspend')}>
                      Suspend
                    </Button>
                  )}
                  {f.approvalStatus === 'suspended' && (
                    <Button disabled={busy} onClick={() => openDialog('reinstate')}>
                      Reinstate
                    </Button>
                  )}
                </div>
              </div>

              <Banner title="This application comes from an account that already shops on MarketLink.">
                Approving turns the same account into a stall; no second account is created. They keep every customer
                feature they have now.
              </Banner>

              {f.approvalStatus === 'suspended' && (
                <Banner variant="warning" title="This stall is suspended.">
                  Its products stay hidden from customers. Orders already placed still run their course (D-09).
                </Banner>
              )}

              {f.approvalStatus === 'rejected' && f.rejectReason && (
                <Banner variant="danger" title="This application was rejected.">
                  Reason shown to the applicant: {f.rejectReason}
                </Banner>
              )}

              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="flex flex-col gap-8">
                  {(!!f.photoUrls?.length || f.videoUrl) && (
                    <section className="flex flex-col gap-3">
                      <h2 className="text-h2">Photos of the plot</h2>
                      <div className="flex flex-wrap gap-2">
                        {f.photoUrls?.map((url) => (
                          <a key={url} href={fileUrl(url)} target="_blank" rel="noreferrer">
                            <img
                              src={fileUrl(url)}
                              alt="Plot"
                              className="border-line-strong size-28 rounded-sm border-[1.5px] object-cover"
                            />
                          </a>
                        ))}
                        {f.videoUrl && (
                          <a
                            href={fileUrl(f.videoUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="border-line-strong bg-surface-sunken text-small flex size-28 flex-col items-center justify-center gap-1 rounded-sm border-[1.5px] text-center"
                          >
                            Watch video
                          </a>
                        )}
                      </div>
                      <p className="text-small text-ink-muted">
                        Check that the plot in the photos looks like the pin on the map and grows what the applicant
                        listed. You are not checking licences, food safety or organic claims.
                      </p>
                    </section>
                  )}

                  {(hasGrows || hasPlot) && (
                    <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      {hasGrows && (
                        <Card className="flex flex-col gap-3 p-6">
                          <h2 className="text-h3">What they grow</h2>
                          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
                            {!!f.categories?.length && (
                              <>
                                <dt className="text-ink-muted">Categories</dt>
                                <dd className="m-0">{f.categories.join(', ')}</dd>
                              </>
                            )}
                            {f.mainCrops && (
                              <>
                                <dt className="text-ink-muted">Main crops</dt>
                                <dd className="m-0">{f.mainCrops}</dd>
                              </>
                            )}
                            {f.weeklyVolume && (
                              <>
                                <dt className="text-ink-muted">Volume</dt>
                                <dd className="m-0">{f.weeklyVolume}</dd>
                              </>
                            )}
                          </dl>
                          {f.growingMethod && (
                            <p className="text-small">
                              <b>Their own words:</b> {f.growingMethod}
                            </p>
                          )}
                        </Card>
                      )}
                      {hasPlot && (
                        <Card className="flex flex-col gap-3 p-6">
                          <h2 className="text-h3">The plot</h2>
                          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
                            {f.plotAddress && (
                              <>
                                <dt className="text-ink-muted">Address</dt>
                                <dd className="m-0">{f.plotAddress}</dd>
                              </>
                            )}
                            {f.plotSize && (
                              <>
                                <dt className="text-ink-muted">Size</dt>
                                <dd className="m-0">{f.plotSize}</dd>
                              </>
                            )}
                            {f.growingSinceYear && (
                              <>
                                <dt className="text-ink-muted">Growing since</dt>
                                <dd className="m-0">{f.growingSinceYear}</dd>
                              </>
                            )}
                          </dl>
                        </Card>
                      )}
                    </section>
                  )}

                  <section className="flex flex-col gap-3">
                    <h2 className="text-h2">The stall they are asking for</h2>
                    <Card className="p-6">
                      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
                        <dt className="text-ink-muted">Stall name</dt>
                        <dd className="m-0">{f.stallName}</dd>
                        <dt className="text-ink-muted">Contact person</dt>
                        <dd className="m-0">
                          {f.contactPerson} · {f.phone}
                        </dd>
                        <dt className="text-ink-muted">Email</dt>
                        <dd className="m-0">{f.email}</dd>
                        {f.description && (
                          <>
                            <dt className="text-ink-muted">Description</dt>
                            <dd className="m-0">{f.description}</dd>
                          </>
                        )}
                        {f.preferredMarketName && (
                          <>
                            <dt className="text-ink-muted">Market wanted</dt>
                            <dd className="m-0">{f.preferredMarketName}</dd>
                          </>
                        )}
                      </dl>
                    </Card>
                  </section>

                  <section className="flex flex-col gap-3">
                    <h2 className="text-h2">History</h2>
                    <ol className="m-0 flex flex-col p-0">
                      <li className="relative grid grid-cols-[28px_1fr] items-start gap-3 py-2">
                        <span className="bg-surface-sunken grid size-7 flex-none place-items-center rounded-full" />
                        <div>
                          <b className="text-[15px]">Application sent</b>
                          <p className="text-ink-muted mt-0.5 text-[13px]">{formatDate(new Date(f.createdAt))}</p>
                        </div>
                      </li>
                      <li className="relative grid grid-cols-[28px_1fr] items-start gap-3 py-2">
                        <span
                          aria-hidden="true"
                          className="border-line-strong absolute -top-2 left-3.25 h-4 border-l-2 border-dotted"
                        />
                        <span className="bg-surface-sunken grid size-7 flex-none place-items-center rounded-full opacity-45" />
                        <div>
                          <b className="text-[15px]">Account created as a customer</b>
                          <p className="text-ink-muted mt-0.5 text-[13px]">{formatDate(new Date(f.customerSince))}</p>
                        </div>
                      </li>
                    </ol>
                  </section>
                </div>

                <aside className="flex flex-col gap-4">
                  <Card className="flex flex-col gap-3 p-6">
                    <h2 className="text-h3">Applicant</h2>
                    <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
                      <dt className="text-ink-muted">Name</dt>
                      <dd className="m-0">{f.contactPerson}</dd>
                      <dt className="text-ink-muted">Customer since</dt>
                      <dd className="m-0">{formatDate(new Date(f.customerSince))}</dd>
                      <dt className="text-ink-muted">Account status</dt>
                      <dd className="m-0 capitalize">{f.accountStatus}</dd>
                    </dl>
                  </Card>

                  {(f.plotLatitude != null || f.preferredMarketName) && (
                    <MapPlaceholder label="The plot and the market they want to sell at" />
                  )}

                  <Card className="flex flex-col gap-2 p-6">
                    <h3 className="text-h3">What approval does</h3>
                    <p className="text-small">
                      Their role becomes Farmer and a stall panel opens. They keep buying from other stalls with the
                      same account. Nothing is listed until they add products and set a pickup window.
                    </p>
                  </Card>
                </aside>
              </div>
            </>
          );
        })()}

      <Dialog
        open={dialog !== null}
        tone={dialog === 'reject' || dialog === 'suspend' ? 'danger' : undefined}
        title={dialog && status.kind === 'ready' ? DIALOG_COPY[dialog].title(status.data.stallName) : ''}
        onClose={() => setDialog(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)} disabled={busy}>
              {dialog === 'reject' ? 'Keep reviewing' : 'Not yet'}
            </Button>
            <Button
              variant={dialog === 'reject' || dialog === 'suspend' ? 'danger' : 'primary'}
              onClick={confirmDialog}
              disabled={busy}
            >
              {dialog ? DIALOG_COPY[dialog].confirm : ''}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p>{dialog ? DIALOG_COPY[dialog].body : ''}</p>
          {dialog === 'reject' && (
            <SelectField
              id="reject-reason"
              label="Reason the applicant will see"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              options={REJECT_REASONS}
            />
          )}
        </div>
      </Dialog>
    </div>
  );
};

export default AdminFarmerDetailPage;
