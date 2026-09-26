import { isAxiosError } from 'axios';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ConversationApi from '@/api-requests/conversation.requests';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import type { ReportReason } from '@/types/chat.types';

const REASONS: ReportReason[] = ['spam', 'abuse', 'scam', 'other'];
const NOTE_MAX = 255;

type Props = { messageId: number | null; onClose: () => void; onReported: (messageId: number) => void };

/** FR-116. Mở khi `messageId` khác null. Người dùng dựng lại bằng `key={messageId}` nên state tự sạch mỗi lần mở. */
export default function ReportDialog({ messageId, onClose, onReported }: Props) {
  const { t } = useTranslation('common');
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const submit = async () => {
    if (messageId === null || !reason || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await ConversationApi.report(messageId, { reason, note: note.trim() || undefined });
      onReported(messageId);
    } catch (error) {
      // uq_report_once: đã báo rồi thì kết quả với người dùng là như nhau
      if (isAxiosError(error) && error.response?.status === 409) onReported(messageId);
      else setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={messageId !== null}
      title={t('chat.reportTitle')}
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('chat.cancel')}
          </Button>
          <Button variant="danger" disabled={!reason || busy} onClick={() => void submit()}>
            {t('chat.report')}
          </Button>
        </>
      }
    >
      <fieldset className="flex flex-col gap-2 border-0 p-0">
        <legend className="text-small text-ink-muted mb-2">{t('chat.reportWhy')}</legend>
        {REASONS.map((r) => (
          <label key={r} htmlFor={r} className="flex items-center gap-2 font-sans">
            <input
              id={r}
              type="radio"
              name="report-reason"
              value={r}
              checked={reason === r}
              onChange={() => setReason(r)}
            />
            {t(`chat.reason.${r}`)}
          </label>
        ))}
      </fieldset>
      <label htmlFor="report-note" className="mt-4 flex flex-col gap-1 font-sans">
        <span>{t('chat.reportNote')}</span>
        <textarea
          id="report-note"
          value={note}
          maxLength={NOTE_MAX}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="border-line-strong bg-surface text-ink rounded-md border p-2"
        />
        <span className="text-small text-ink-muted">{t('chat.noteLeft', { count: NOTE_MAX - note.length })}</span>
      </label>
      {!reason ? <p className="text-small text-ink-muted mt-2">{t('chat.chooseReason')}</p> : null}
      {failed ? (
        <p role="alert" className="text-small text-danger mt-2">
          {t('chat.reportFailed')}
        </p>
      ) : null}
    </Dialog>
  );
}
