import { useTranslation } from 'react-i18next';
import { DataState } from '@/components/ui/data-state';
import { Button } from '@/components/ui/button';
import { formatDayMonth, formatTime } from '@/lib/format';
import type { ConversationSummary } from '@/types/chat.types';

type Props = {
  threads: ConversationSummary[];
  activeId: number | null;
  onPick: (id: number) => void;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  /** Câu dưới "No conversations yet" theo vai: Farmer không tự mở được cuộc trò chuyện. */
  emptyText?: string;
};

/** Hôm nay thì hiện giờ, cũ hơn thì hiện ngày — cùng quy ước với danh sách đơn. */
const when = (iso: string | null) => {
  if (!iso) return '';
  const at = new Date(iso);
  const sameDay = new Date().toDateString() === at.toDateString();
  return sameDay ? formatTime(at) : formatDayMonth(at);
};

export default function ThreadList({ threads, activeId, onPick, loading, error, onRetry, emptyText }: Props) {
  const { t } = useTranslation('common');

  if (loading) {
    return (
      <div role="status" className="text-small text-ink-muted p-4">
        {t('chat.loadingThreads')}
      </div>
    );
  }

  if (error) {
    return (
      <DataState
        variant="error"
        title={t('chat.threadsErrorTitle')}
        text={t('chat.threadsErrorText')}
        action={
          <Button variant="secondary" size="sm" onClick={onRetry}>
            {t('chat.tryAgain')}
          </Button>
        }
      />
    );
  }

  if (threads.length === 0) {
    return <DataState title={t('chat.noThreadsTitle')} text={emptyText ?? t('chat.noThreadsText')} />;
  }

  return (
    <ul className="flex flex-col">
      {threads.map((thread) => (
        <li key={thread.id}>
          <button
            type="button"
            onClick={() => onPick(thread.id)}
            aria-current={activeId === thread.id ? 'true' : undefined}
            className={`border-line-strong flex w-full items-start gap-3 border-b p-3 text-left ${
              activeId === thread.id ? 'bg-surface-raised' : ''
            }`}
          >
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="text-ink truncate font-sans font-semibold">{thread.other.fullName}</span>
                <span className="text-small text-ink-muted shrink-0">{when(thread.lastMessageAt)}</span>
              </span>
              <span className="text-small text-ink-muted mt-1 block truncate">{thread.lastMessageText}</span>
            </span>
            {thread.unreadCount > 0 ? (
              <span
                aria-label={t('chat.unreadCount', { count: thread.unreadCount })}
                className="bg-brand text-on-brand text-small mt-1 shrink-0 rounded-full px-2"
              >
                {thread.unreadCount}
              </span>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}
