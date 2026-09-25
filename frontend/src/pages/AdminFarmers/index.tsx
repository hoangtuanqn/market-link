import { useState } from 'react';
import { Link } from 'react-router';
import { Button, ButtonLink } from '@/components/ui/button';
import { DataState } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { Table, type TableColumn } from '@/components/ui/table';
import Tabs from '@/components/ui/tabs';
import { farmers as SEEDED_FARMERS, marketName, products } from '@/data/catalog';
import type { FarmerApproval, FarmerType } from '@/types/farmer.types';
import Notification from '@/utils/notification';

const STATUSES: FarmerApproval[] = ['pending', 'approved', 'suspended', 'rejected'];
const STATUS_LABEL: Record<FarmerApproval, string> = {
  pending: 'Waiting for approval',
  approved: 'Approved',
  suspended: 'Suspended',
  rejected: 'Rejected',
};
const EMPTY: Record<FarmerApproval, [string, string]> = {
  pending: [
    'No registrations waiting',
    'New Farmer applications arrive here for review before they can list products.',
  ],
  approved: ['No approved stalls', 'Approve a registration and the stall appears here, visible to customers.'],
  suspended: [
    'No suspended stalls',
    'A suspended stall is hidden from customers but finishes the orders it already has (D-09).',
  ],
  rejected: ['No rejected registrations', 'Rejected Farmers keep their account and can be told why.'],
};
const REJECT_REASONS = [
  'Details do not match the stall',
  'Market is full',
  'Could not reach the contact number',
  'Other',
];

type Dialog2 = { kind: 'approve' | 'reject' | 'suspend'; farmer: FarmerType } | null;

/** FR-071 — approve, reject, suspend or reinstate a Farmer registration. Nothing is stored: a reload restores the seed. */
const AdminFarmersPage = () => {
  const [farmers, setFarmers] = useState<FarmerType[]>(SEEDED_FARMERS);
  const [tab, setTab] = useState<FarmerApproval>('pending');
  const [q, setQ] = useState('');
  const [dialog, setDialog] = useState<Dialog2>(null);
  const [reason, setReason] = useState(REJECT_REASONS[0]);

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

  const columns: TableColumn<FarmerType>[] = [
    {
      key: 'stall',
      label: 'Stall',
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
      label: 'Markets',
      render: (f) =>
        f.markets.map((id) => (
          <span key={id} className="block">
            {marketName(id)}
          </span>
        )),
    },
    { key: 'r', label: 'Registered', render: (f) => f.registered },
    { key: 'p', label: 'Products', align: 'num', render: (f) => products.filter((p) => p.farmerId === f.id).length },
    {
      key: 'rt',
      label: 'Rating',
      align: 'num',
      render: (f) =>
        f.rating != null ? (
          <>
            {f.rating.toFixed(1)} <span className="text-ink-muted font-normal">{f.reviews} reviews</span>
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
                Approve
              </Button>
              <Button variant="danger" size="sm" onClick={() => setDialog({ kind: 'reject', farmer: f })}>
                Reject
              </Button>
            </div>
          );
        if (f.approval === 'approved')
          return (
            <div className="flex justify-end gap-2">
              <ButtonLink variant="secondary" size="sm" to={`/admin/farmers/${f.id}`}>
                View
              </ButtonLink>
              <Button variant="danger" size="sm" onClick={() => setDialog({ kind: 'suspend', farmer: f })}>
                Suspend
              </Button>
            </div>
          );
        if (f.approval === 'suspended')
          return (
            <div className="flex justify-end gap-2">
              <ButtonLink variant="secondary" size="sm" to={`/admin/farmers/${f.id}`}>
                View
              </ButtonLink>
              <Button
                size="sm"
                onClick={() => setApproval(f.id, 'approved', `${f.stall} reinstated. Products are visible again.`)}
              >
                Reinstate
              </Button>
            </div>
          );
        return (
          <ButtonLink variant="ghost" size="sm" to={`/admin/farmers/${f.id}`}>
            View
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
          <h1 className="text-h1">Farmers</h1>
          <p className="text-body max-w-160">
            Approve an application before the stall can list products. Most applications come from accounts that already
            shop here, so each one carries the applicant&apos;s order history next to their photos. Suspend a stall to
            hide its products and stop new orders; its running orders finish as normal (D-09).
          </p>
        </div>
        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          className="border-line-strong bg-surface-raised focus-within:outline-focus flex w-full max-w-105 items-stretch overflow-hidden rounded-sm border-[1.5px] focus-within:outline-2 focus-within:outline-offset-1 [&_button]:rounded-none"
        >
          <label htmlFor="q" className="sr-only">
            Search Farmers
          </label>
          <input
            id="q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Stall, contact person, phone"
            className="text-body min-w-0 flex-1 bg-transparent px-3 outline-none"
          />
          <Button type="submit">Search</Button>
        </form>
      </div>

      <Tabs
        label="Farmers by status"
        value={tab}
        onChange={(id) => setTab(id as FarmerApproval)}
        tabs={STATUSES.map((s) => ({ id: s, label: STATUS_LABEL[s], count: by(s).length }))}
      />

      {activeRows.length ? (
        <Table columns={columns} rows={activeRows} rowClassName={(f) => (isNew(f) ? '!bg-highlight' : undefined)} />
      ) : (
        <DataState title={EMPTY[tab][0]} text={EMPTY[tab][1]} />
      )}

      <Dialog
        open={dialog?.kind === 'approve'}
        title={`Approve ${dialog?.farmer.stall ?? ''}?`}
        onClose={() => setDialog(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Not yet
            </Button>
            <Button
              onClick={() => {
                if (dialog)
                  setApproval(
                    dialog.farmer.id,
                    'approved',
                    `${dialog.farmer.stall} approved. The stall can list products now.`,
                  );
                setDialog(null);
              }}
            >
              Approve stall
            </Button>
          </>
        }
      >
        <p>The stall becomes visible to customers and can list products right away. The Farmer is notified.</p>
      </Dialog>

      <Dialog
        open={dialog?.kind === 'reject'}
        title={`Reject ${dialog?.farmer.stall ?? ''}?`}
        tone="danger"
        onClose={() => setDialog(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Not yet
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (dialog)
                  setApproval(
                    dialog.farmer.id,
                    'rejected',
                    `${dialog.farmer.stall} rejected. They keep their account.`,
                  );
                setDialog(null);
              }}
            >
              Reject registration
            </Button>
          </>
        }
      >
        <p>The Farmer keeps their sign-in but cannot list products.</p>
        <label className="text-ink-muted mt-2 block text-[13px] font-bold" htmlFor="rwhy">
          Reason the Farmer will see
        </label>
        <select
          id="rwhy"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="border-line-strong bg-surface-raised text-body mt-1 min-h-11 w-full rounded-sm border-[1.5px] px-3"
        >
          {REJECT_REASONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </Dialog>

      <Dialog
        open={dialog?.kind === 'suspend'}
        title={`Suspend ${dialog?.farmer.stall ?? ''}?`}
        tone="danger"
        onClose={() => setDialog(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Not yet
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (dialog)
                  setApproval(
                    dialog.farmer.id,
                    'suspended',
                    `${dialog.farmer.stall} suspended. Running orders finish as normal.`,
                  );
                setDialog(null);
              }}
            >
              Suspend stall
            </Button>
          </>
        }
      >
        <p>
          All products are hidden and no new orders are accepted. Orders already placed continue so customers do not
          lose what they booked (D-09).
        </p>
      </Dialog>
    </div>
  );
};

export default AdminFarmersPage;
