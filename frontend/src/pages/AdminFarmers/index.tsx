import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button, ButtonLink } from '@/components/ui/button';
import { DataState } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { Table, type TableColumn } from '@/components/ui/table';
import Tabs from '@/components/ui/tabs';
import { farmers as SEEDED_FARMERS, marketName, products } from '@/data/catalog';
import { formatDate } from '@/lib/format';
import type { FarmerApproval, FarmerType } from '@/types/farmer.types';
import Notification from '@/utils/notification';

const STATUSES: FarmerApproval[] = ['pending', 'approved', 'suspended', 'rejected'];
// Labels and empty states: `status.<s>` and `empty.<s>.title|text` in AdminFarmers.json. A suspended stall is hidden
// from customers but finishes the orders it already has (D-09).
const REJECT_REASONS = ['mismatch', 'full', 'unreachable', 'other'] as const;
type RejectReason = (typeof REJECT_REASONS)[number];

/** "02/08/2026" (how the seeded stalls spell it) → the reader's date format */
const dmy = (s: string) => {
  const [d, m, y] = s.split('/').map(Number);
  return y ? formatDate(new Date(y, m - 1, d)) : s;
};

type Dialog2 = { kind: 'approve' | 'reject' | 'suspend'; farmer: FarmerType } | null;

/** FR-071 — approve, reject, suspend or reinstate a Farmer registration. Nothing is stored: a reload restores the seed. */
const AdminFarmersPage = () => {
  const { t, i18n } = useTranslation('AdminFarmers');
  const [farmers, setFarmers] = useState<FarmerType[]>(SEEDED_FARMERS);
  const [tab, setTab] = useState<FarmerApproval>('pending');
  const [q, setQ] = useState('');
  const [dialog, setDialog] = useState<Dialog2>(null);
  const [reason, setReason] = useState<RejectReason>(REJECT_REASONS[0]);

  const qLower = q.trim().toLowerCase();
  const filtered = farmers.filter(
    (f) =>
      !qLower ||
      f.stall.toLowerCase().includes(qLower) ||
      f.person.toLowerCase().includes(qLower) ||
      f.phone.includes(qLower),
  );
  const by = (s: FarmerApproval) => filtered.filter((f) => f.approval === s);

  const setApproval = (id: number, to: FarmerApproval, text: string) => {
    setFarmers((prev) => prev.map((f) => (f.id === id ? { ...f, approval: to } : f)));
    Notification.success({ text });
  };

  const rating = (n: number) =>
    new Intl.NumberFormat(i18n.language, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);

  const columns: TableColumn<FarmerType>[] = [
    {
      key: 'stall',
      label: t('col.stall'),
      render: (f) => (
        <>
          <Link to={`/admin/farmers/${f.id}`} className="text-brand font-bold underline-offset-2 hover:underline">
            {f.stall}
          </Link>
          <span className="text-ink-muted mt-0.5 block text-[13px] font-normal">
            {f.person} · {f.phone}
          </span>
        </>
      ),
    },
    {
      key: 'm',
      label: t('col.markets'),
      render: (f) =>
        f.markets.map((id) => (
          <span key={id} className="block">
            {marketName(id)}
          </span>
        )),
    },
    { key: 'r', label: t('col.registered'), render: (f) => dmy(f.registered) },
    {
      key: 'p',
      label: t('col.products'),
      align: 'num',
      render: (f) => products.filter((p) => p.farmerId === f.id).length,
    },
    {
      key: 'rt',
      label: t('col.rating'),
      align: 'num',
      render: (f) =>
        f.rating != null ? (
          <>
            {rating(f.rating)} <span className="text-ink-muted font-normal">{t('reviews', { count: f.reviews })}</span>
          </>
        ) : (
          '—'
        ),
    },
    {
      key: 'a',
      label: '',
      align: 'actions',
      render: (f) => {
        if (f.approval === 'pending')
          return (
            <div className="flex justify-end gap-2">
              <Button size="sm" onClick={() => setDialog({ kind: 'approve', farmer: f })}>
                {t('action.approve')}
              </Button>
              <Button variant="danger" size="sm" onClick={() => setDialog({ kind: 'reject', farmer: f })}>
                {t('action.reject')}
              </Button>
            </div>
          );
        if (f.approval === 'approved')
          return (
            <div className="flex justify-end gap-2">
              <ButtonLink variant="secondary" size="sm" to={`/admin/farmers/${f.id}`}>
                {t('action.view')}
              </ButtonLink>
              <Button variant="danger" size="sm" onClick={() => setDialog({ kind: 'suspend', farmer: f })}>
                {t('action.suspend')}
              </Button>
            </div>
          );
        if (f.approval === 'suspended')
          return (
            <div className="flex justify-end gap-2">
              <ButtonLink variant="secondary" size="sm" to={`/admin/farmers/${f.id}`}>
                {t('action.view')}
              </ButtonLink>
              <Button
                size="sm"
                onClick={() => setApproval(f.id, 'approved', t('toast.reinstated', { stall: f.stall }))}
              >
                {t('action.reinstate')}
              </Button>
            </div>
          );
        return (
          <ButtonLink variant="ghost" size="sm" to={`/admin/farmers/${f.id}`}>
            {t('action.view')}
          </ButtonLink>
        );
      },
    },
  ];

  const activeRows = by(tab);
  const isNew = (f: FarmerType) => f.approval === 'pending' && f.registered === '23/09/2026';

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
          <label htmlFor="q" className="sr-only">
            {t('search.label')}
          </label>
          <input
            id="q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('search.placeholder')}
            className="text-body min-w-0 flex-1 bg-transparent px-3 outline-none"
          />
          <Button type="submit">{t('search.submit')}</Button>
        </form>
      </div>

      <Tabs
        label={t('tabsLabel')}
        value={tab}
        onChange={(id) => setTab(id as FarmerApproval)}
        tabs={STATUSES.map((s) => ({ id: s, label: t(`status.${s}`), count: by(s).length }))}
      />

      {activeRows.length ? (
        <Table columns={columns} rows={activeRows} rowClassName={(f) => (isNew(f) ? '!bg-highlight' : undefined)} />
      ) : (
        <DataState title={t(`empty.${tab}.title`)} text={t(`empty.${tab}.text`)} />
      )}

      <Dialog
        open={dialog?.kind === 'approve'}
        title={t('approve.title', { stall: dialog?.farmer.stall ?? '' })}
        onClose={() => setDialog(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)}>
              {t('notYet')}
            </Button>
            <Button
              onClick={() => {
                if (dialog)
                  setApproval(dialog.farmer.id, 'approved', t('toast.approved', { stall: dialog.farmer.stall }));
                setDialog(null);
              }}
            >
              {t('approve.confirm')}
            </Button>
          </>
        }
      >
        <p>{t('approve.text')}</p>
      </Dialog>

      <Dialog
        open={dialog?.kind === 'reject'}
        title={t('reject.title', { stall: dialog?.farmer.stall ?? '' })}
        tone="danger"
        onClose={() => setDialog(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)}>
              {t('notYet')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (dialog)
                  setApproval(dialog.farmer.id, 'rejected', t('toast.rejected', { stall: dialog.farmer.stall }));
                setDialog(null);
              }}
            >
              {t('reject.confirm')}
            </Button>
          </>
        }
      >
        <p>{t('reject.text')}</p>
        <label className="text-ink-muted mt-2 block text-[13px] font-bold" htmlFor="rwhy">
          {t('reject.reason')}
        </label>
        <select
          id="rwhy"
          value={reason}
          onChange={(e) => setReason(e.target.value as RejectReason)}
          className="border-line-strong bg-surface-raised text-body mt-1 min-h-11 w-full rounded-sm border-[1.5px] px-3"
        >
          {REJECT_REASONS.map((r) => (
            <option key={r} value={r}>
              {t(`reason.${r}`)}
            </option>
          ))}
        </select>
      </Dialog>

      <Dialog
        open={dialog?.kind === 'suspend'}
        title={t('suspend.title', { stall: dialog?.farmer.stall ?? '' })}
        tone="danger"
        onClose={() => setDialog(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)}>
              {t('notYet')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (dialog)
                  setApproval(dialog.farmer.id, 'suspended', t('toast.suspended', { stall: dialog.farmer.stall }));
                setDialog(null);
              }}
            >
              {t('suspend.confirm')}
            </Button>
          </>
        }
      >
        {/* Running orders continue so customers do not lose what they booked (D-09). */}
        <p>{t('suspend.text')}</p>
      </Dialog>
    </div>
  );
};

export default AdminFarmersPage;
