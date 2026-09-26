import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon, ClockIcon } from '@/components/icons';
import { Button, ButtonLink } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { DataState } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { Table, type TableColumn } from '@/components/ui/table';
import { ADMIN_ANNOUNCEMENTS_PATH, ADMIN_CATEGORIES_PATH } from '@/constants/nav';
import { feedback, type FeedbackType } from '@/data/admin';
import Notification from '@/utils/notification';

const FILTERS = ['open', 'answered', 'bug', 'suggestion', 'query'] as const;
type Filter = (typeof FILTERS)[number];

/**
 * FR-081 — bug reports, suggestions and questions sent through the feedback form. A row opens the whole message in a
 * dialog: there is no reply screen because where an answer goes is still an open question.
 */
const AdminFeedbackPage = () => {
  const { t } = useTranslation('AdminFeedback');
  const [filter, setFilter] = useState<Filter>('open');
  const [open, setOpen] = useState<FeedbackType | null>(null);
  const [reply, setReply] = useState('');

  const count = (f: Filter) =>
    f === 'open' || f === 'answered'
      ? feedback.filter((x) => x.status === f).length
      : feedback.filter((x) => x.type === f).length;

  const rows = feedback.filter((x) =>
    filter === 'open' || filter === 'answered' ? x.status === filter : x.type === filter,
  );

  const send = () => {
    Notification.success({ text: reply.trim() ? t('toast.answered') : t('toast.markedOnly') });
    setOpen(null);
    setReply('');
  };

  const columns: TableColumn<FeedbackType>[] = [
    { key: 'type', label: t('col.type'), render: (f) => t(`type.${f.type}`) },
    {
      key: 'text',
      label: t('col.message'),
      render: (f) => (
        <button
          type="button"
          onClick={() => setOpen(f)}
          className="text-brand text-small cursor-pointer bg-transparent text-left underline"
        >
          {f.text}
        </button>
      ),
    },
    {
      key: 'from',
      label: t('col.from'),
      render: (f) => (
        <>
          {f.from}
          <span className="text-ink-muted block text-[13px]">{f.date}</span>
        </>
      ),
    },
    {
      key: 'status',
      label: t('col.status'),
      render: (f) =>
        f.status === 'open' ? (
          <span className="bg-status-placed-bg text-status-placed-ink inline-flex items-center gap-1 rounded-full py-0.75 pr-2.5 pl-2 text-[13px] leading-4.5 font-bold">
            <ClockIcon size={14} />
            {t('status.open')}
          </span>
        ) : (
          <span className="bg-status-completed-bg text-status-completed-ink inline-flex items-center gap-1 rounded-full py-0.75 pr-2.5 pl-2 text-[13px] leading-4.5 font-bold">
            <CheckIcon size={14} />
            {t('status.answered')}
          </span>
        ),
    },
    {
      key: 'action',
      label: '',
      align: 'actions',
      render: (f) => (
        <Button variant="secondary" size="sm" onClick={() => setOpen(f)}>
          {t(f.status === 'open' ? 'action.readAndAnswer' : 'action.read')}
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">{t('title')}</h1>
          <p className="text-body max-w-160">{t('intro')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink to={ADMIN_CATEGORIES_PATH} variant="secondary">
            {t('link.categories')}
          </ButtonLink>
          <ButtonLink to={ADMIN_ANNOUNCEMENTS_PATH} variant="secondary">
            {t('link.announcements')}
          </ButtonLink>
        </div>
      </div>

      <div role="group" aria-label={t('filterLabel')} className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Chip key={f} pressed={filter === f} onClick={() => setFilter(f)}>
            {t(`filter.${f}`)}
            <span className="text-ink-muted ml-1">({count(f)})</span>
          </Chip>
        ))}
      </div>

      {rows.length ? (
        <Table columns={columns} rows={rows} />
      ) : (
        <DataState title={t('empty.title')} text={t('empty.text')} />
      )}

      <Dialog
        open={open !== null}
        title={open ? t('dialog.title', { type: t(`type.${open.type}`), from: open.from }) : ''}
        onClose={() => setOpen(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setOpen(null)}>
              {t('dialog.close')}
            </Button>
            <Button onClick={send}>{open?.status === 'open' ? t('dialog.send') : t('dialog.sendAgain')}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-small text-ink-muted">
            {t('dialog.sent', {
              date: open?.date,
              state: open?.status === 'open' ? t('dialog.notAnswered') : t('dialog.alreadyAnswered'),
            })}
          </p>
          <p className="bg-surface-sunken border-line rounded-sm border p-4 text-[15px]">{open?.text}</p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="feedback-reply" className="text-small font-bold">
              {t('dialog.yourAnswer')}
            </label>
            <textarea
              id="feedback-reply"
              rows={4}
              value={reply}
              placeholder={t('dialog.replyPlaceholder')}
              onChange={(e) => setReply(e.target.value)}
              className="border-line-strong bg-surface-raised focus:outline-focus rounded-sm border-[1.5px] p-3 focus:outline-2"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default AdminFeedbackPage;
