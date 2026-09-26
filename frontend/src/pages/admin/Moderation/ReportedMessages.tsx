import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ModerationApi from '@/api-requests/moderation.requests';
import ChatPhoto from '@/components/chat/ChatPhoto';
import { Button } from '@/components/ui/button';
import { DataState, LoadError } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { SelectField } from '@/components/ui/input';
import useRequest from '@/hooks/useRequest';
import { chatWhen } from '@/lib/chat/time';
import type { ReportDetail, ReportListItem, ReportStatus } from '@/types/chat.types';
import Notification from '@/utils/notification';

function ReportDetailDialog({
  reportId,
  onClose,
  onHide,
  onDismiss,
}: {
  reportId: number;
  onClose: () => void;
  onHide: (reportId: number, messageId: number) => void;
  onDismiss: (reportId: number) => void;
}) {
  const { t } = useTranslation('AdminModeration');
  const { state, retry } = useRequest(`report:${reportId}`, () => ModerationApi.report(reportId).then((r) => r.data));
  const [hiding, setHiding] = useState(false);
  const [busy, setBusy] = useState(false);

  if (state.kind === 'error') {
    return (
      <Dialog open title={t('messages.noun')} onClose={onClose} actions={null}>
        <LoadError noun={t('messages.noun')} onRetry={retry} />
      </Dialog>
    );
  }

  if (state.kind === 'loading') {
    return (
      <Dialog open title={t('messages.noun')} onClose={onClose} actions={null}>
        <p role="status" className="text-small text-ink-muted">
          Loading...
        </p>
      </Dialog>
    );
  }

  const detail: ReportDetail = state.data;

  const hide = async () => {
    setBusy(true);
    try {
      await ModerationApi.hide(detail.messageId);
      Notification.success({ text: t('messages.hidden_toast') });
      onHide(detail.reportId, detail.messageId);
      onClose();
    } catch {
      Notification.error({ text: t('errors.network', { ns: 'common' }) });
    } finally {
      setBusy(false);
    }
  };

  const dismiss = async () => {
    setBusy(true);
    try {
      await ModerationApi.dismiss(detail.reportId);
      Notification.success({ text: t('messages.dismissed_toast') });
      onDismiss(detail.reportId);
      onClose();
    } catch {
      Notification.error({ text: t('errors.network', { ns: 'common' }) });
    } finally {
      setBusy(false);
    }
  };

  if (hiding) {
    return (
      <Dialog
        open
        title={t('messages.hideTitle')}
        onClose={() => setHiding(false)}
        tone="danger"
        actions={
          <>
            <Button variant="secondary" onClick={() => setHiding(false)} disabled={busy}>
              {t('chat.cancel', { ns: 'common' })}
            </Button>
            <Button variant="danger" onClick={() => void hide()} disabled={busy}>
              {t('messages.hideConfirm')}
            </Button>
          </>
        }
      >
        <p>{t('messages.hideText')}</p>
      </Dialog>
    );
  }

  return (
    <Dialog
      open
      title={t('messages.noun')}
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={() => void dismiss()} disabled={busy}>
            {t('messages.dismiss')}
          </Button>
          <Button variant="danger" onClick={() => setHiding(true)} disabled={busy}>
            {t('messages.hide')}
          </Button>
        </>
      }
    >
      <ol aria-label={t('messages.context')} className="flex flex-col gap-2">
        {detail.context.map((m) => (
          <li
            key={m.id}
            aria-current={m.reported ? 'true' : undefined}
            className={`rounded-md border p-2 ${m.reported ? 'border-danger' : 'border-line-strong'}`}
          >
            <div className="text-small mb-1 flex gap-2">
              <span className="font-semibold">{m.senderName}</span>
              <time className="text-ink-muted">{chatWhen(m.createdAt)}</time>
              {m.hidden ? <span className="text-danger ml-auto">{t('messages.hidden')}</span> : null}
            </div>
            {m.hasPhoto && m.attachmentId ? (
              <ChatPhoto
                attachment={{ attachmentId: m.attachmentId, url: '', width: null, height: null }}
                alt={t('messages.photo')}
              />
            ) : null}
            {m.body ? <div className="whitespace-pre-wrap">{m.body}</div> : null}
          </li>
        ))}
      </ol>
    </Dialog>
  );
}

export default function ReportedMessages() {
  const { t } = useTranslation('AdminModeration');
  const [status, setStatus] = useState<ReportStatus>('new');

  const { state, retry, mutate } = useRequest(`reports:${status}`, () =>
    ModerationApi.reports({ status, page: 1, pageSize: 20 }).then((r) => r.data.items),
  );

  const [reviewingId, setReviewingId] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-4 p-4">
      <p className="text-ink-muted">{t('messages.boundary')}</p>

      <div className="flex items-center justify-between">
        <SelectField
          id="report-status"
          label={t('messages.statusLabel')}
          value={status}
          onChange={(e) => setStatus(e.target.value as ReportStatus)}
          options={[
            { value: 'new', label: t('messages.status.new') },
            { value: 'reviewed', label: t('messages.status.reviewed') },
            { value: 'actioned', label: t('messages.status.actioned') },
          ]}
        />
      </div>

      {state.kind === 'error' ? (
        <LoadError noun={t('messages.noun')} onRetry={retry} />
      ) : state.kind === 'loading' ? (
        <p role="status" className="text-small text-ink-muted">
          Loading...
        </p>
      ) : state.data.length === 0 ? (
        <DataState title={t('messages.emptyTitle')} text={t('messages.emptyText')} />
      ) : (
        <div className="flex flex-col gap-4">
          {state.data.map((r: ReportListItem) => (
            <div key={r.reportId} className="border-line-strong flex flex-col gap-2 rounded-md border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{t(`messages.reason.${r.reason}`)}</p>
                  <p className="text-ink-muted text-small">
                    {t('messages.reportedBy', { name: r.reporterName })} •{' '}
                    {t('messages.sentBy', { name: r.senderName })} • {chatWhen(r.reportedAt)}
                  </p>
                </div>
                <Button
                  onClick={() => setReviewingId(r.reportId)}
                  aria-label={t('messages.reviewLabel', { name: r.reporterName })}
                >
                  {t('messages.review')}
                </Button>
              </div>
              <p className="text-ink">{r.preview || t('messages.photo')}</p>
            </div>
          ))}
        </div>
      )}

      {reviewingId !== null ? (
        <ReportDetailDialog
          reportId={reviewingId}
          onClose={() => setReviewingId(null)}
          onHide={(reportId) => {
            if (status === 'new') {
              mutate((items) => items.filter((r) => r.reportId !== reportId));
            }
          }}
          onDismiss={(reportId) => {
            if (status === 'new') {
              mutate((items) => items.filter((r) => r.reportId !== reportId));
            }
          }}
        />
      ) : null}
    </div>
  );
}
