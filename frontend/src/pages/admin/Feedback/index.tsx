import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AskAssistant from '@/components/assistant/AskAssistant';
import { CheckIcon, ClockIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { DataState, LoadError } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { Table, type TableColumn } from '@/components/ui/table';
import FeedbackApi, { type FeedbackDto, type FeedbackStatus } from '@/api-requests/feedback.requests';
import useRequest from '@/hooks/useRequest';
import { formatDate } from '@/lib/format';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';
import FeedbackTableSkeleton from './FeedbackTableSkeleton';

/** Statuses filter server-side via `status`; the three types filter client-side over the fetched page. */
const FILTERS = ['all', 'new', 'reviewed', 'resolved', 'bug', 'suggestion', 'query'] as const;
type Filter = (typeof FILTERS)[number];
const STATUS_FILTERS: FeedbackStatus[] = ['new', 'reviewed', 'resolved'];

const isStatusFilter = (f: Filter): f is FeedbackStatus => (STATUS_FILTERS as string[]).includes(f);

const STATUS_META: Record<FeedbackStatus, { icon: typeof ClockIcon; className: string }> = {
  new: { icon: ClockIcon, className: 'bg-status-placed-bg text-status-placed-ink' },
  reviewed: { icon: ClockIcon, className: 'bg-status-accepted-bg text-status-accepted-ink' },
  resolved: { icon: CheckIcon, className: 'bg-status-completed-bg text-status-completed-ink' },
};

const NO_ROWS: FeedbackDto[] = [];

/**
 * FR-081 — bug reports, suggestions and questions sent through the feedback form. A row opens the whole message in a
 * dialog; the admin only moves it between `new`, `reviewed` and `resolved` (the platform sends no reply).
 */
const AdminFeedbackPage = () => {
  const { t } = useTranslation('AdminFeedback');
  const { t: tAssistant } = useTranslation('common');
  const { t: tc } = useTranslation();
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<FeedbackDto | null>(null);
  const [busy, setBusy] = useState(false);
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
  } = useRequest(`feedback:${filter}`, () =>
    FeedbackApi.list({ status: isStatusFilter(filter) ? filter : undefined, pageSize: 50 }).then((r) => r.items),
  );
  const all = load.kind === 'ready' ? load.data : NO_ROWS;
  const rows = filter === 'all' ? all : isStatusFilter(filter) ? all : all.filter((f) => f.type === filter);

  const showSkeleton = load.kind === 'loading' || initialLoading;

  const setStatus = async (id: number, status: Exclude<FeedbackStatus, 'new'>) => {
    setBusy(true);
    try {
      const updated = await FeedbackApi.setStatus(id, status);
      mutate((items) => items.map((f) => (f.id === id ? updated : f)));
      setOpen(updated);
      Notification.success({ text: t(`toast.${status}`) });
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
    } finally {
      setBusy(false);
    }
  };

  const columns: TableColumn<FeedbackDto>[] = [
    { key: 'type', label: t('col.type'), render: (f) => t(`type.${f.type}`) },
    {
      key: 'text',
      label: t('col.message'),
      render: (f) => (
        <button
          type="button"
          onClick={() => setOpen(f)}
          className="text-brand text-small line-clamp-2 cursor-pointer bg-transparent text-left underline"
        >
          {f.message}
        </button>
      ),
    },
    {
      key: 'from',
      label: t('col.from'),
      render: (f) => (
        <>
          {f.userName ?? t('anonymous')}
          <span className="text-ink-muted block text-[13px]">{formatDate(new Date(f.createdAt))}</span>
        </>
      ),
    },
    {
      key: 'status',
      label: t('col.status'),
      render: (f) => {
        const { icon: Icon, className } = STATUS_META[f.status];
        return (
          <span
            className={Helper.cn(
              'inline-flex items-center gap-1 rounded-full py-0.75 pr-2.5 pl-2 text-[13px] leading-4.5 font-bold',
              className,
            )}
          >
            <Icon size={14} />
            {t(`status.${f.status}`)}
          </span>
        );
      },
    },
    {
      key: 'action',
      label: '',
      align: 'actions',
      render: (f) => (
        <Button variant="secondary" size="sm" onClick={() => setOpen(f)}>
          {t('action.read')}
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-h1 text-ink font-bold">{t('title')}</h1>
          <AskAssistant question={tAssistant('assistant.ask.feedback')} />
        </div>
        <p className="text-body text-ink-muted max-w-160">{t('intro')}</p>
      </div>

      <div role="group" aria-label={t('filterLabel')} className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Chip key={f} pressed={filter === f} onClick={() => setFilter(f)}>
            {t(`filter.${f}`)}
          </Chip>
        ))}
      </div>

      {showSkeleton ? (
        <FeedbackTableSkeleton />
      ) : load.kind === 'error' ? (
        <LoadError noun={t('noun')} onRetry={retry} />
      ) : rows.length ? (
        <div className="flex flex-1 flex-col gap-4">
          <Table caption={t('caption', { count: rows.length })} columns={columns} rows={rows} className="w-full" />
        </div>
      ) : (
        <DataState
          fill
          center
          title={t('empty.title')}
          text={t('empty.text')}
          className="min-h-[380px] w-full flex-1"
        />
      )}

      <Dialog
        open={open !== null}
        title={open ? t('dialog.title', { type: t(`type.${open.type}`), from: open.userName ?? t('anonymous') }) : ''}
        onClose={() => setOpen(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setOpen(null)} disabled={busy}>
              {t('dialog.close')}
            </Button>
            {open && open.status !== 'reviewed' && (
              <Button variant="secondary" disabled={busy} onClick={() => open && void setStatus(open.id, 'reviewed')}>
                {t('dialog.markReviewed')}
              </Button>
            )}
            {open && open.status !== 'resolved' && (
              <Button disabled={busy} onClick={() => open && void setStatus(open.id, 'resolved')}>
                {t('dialog.markResolved')}
              </Button>
            )}
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-small text-ink-muted">
            {open
              ? t('dialog.sent', { date: formatDate(new Date(open.createdAt)), state: t(`status.${open.status}`) })
              : ''}
          </p>
          <p className="bg-surface-sunken border-line rounded-sm border p-4 text-[15px]">{open?.message}</p>
        </div>
      </Dialog>
    </div>
  );
};

export default AdminFeedbackPage;
