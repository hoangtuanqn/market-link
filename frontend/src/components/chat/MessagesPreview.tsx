import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import ConversationApi from '@/api-requests/conversation.requests';
import useRequest from '@/hooks/useRequest';
import useChatUnread from '@/hooks/useChatUnread';
import { chatWhen } from '@/lib/chat/time';
import { displayName } from '@/lib/chat/names';

type Props = {
  to: string;
};

export default function MessagesPreview({ to }: Props) {
  const { t } = useTranslation('common');
  const unreadCount = useChatUnread();

  const { state } = useRequest(`chat-preview:${unreadCount}`, () =>
    ConversationApi.list({ page: 1, size: 4 }).then((r) => r.data.items),
  );

  if (state.kind === 'error') {
    return <div className="text-small text-ink-muted p-4 text-center">{t('chat.previewError')}</div>;
  }

  if (state.kind === 'loading') {
    return (
      <div role="status" className="text-small text-ink-muted p-4 text-center">
        {t('chat.loadingThreads')}
      </div>
    );
  }

  if (state.data.length === 0) {
    return <div className="text-small text-ink-muted p-4 text-center">{t('chat.previewEmpty')}</div>;
  }

  return (
    <div className="flex flex-col">
      {state.data.map((thread) => (
        <Link
          key={thread.id}
          to={`${to}?c=${thread.id}`}
          className="hover:bg-surface flex items-start gap-3 p-3 transition-colors"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate font-semibold">{displayName(thread.other)}</span>
              {thread.lastMessageAt && (
                <time className="text-small text-ink-muted whitespace-nowrap">{chatWhen(thread.lastMessageAt)}</time>
              )}
            </div>
            {/* A freshly opened thread with no message yet: leave it empty, do not fake an "..." mark */}
            <p className="text-small text-ink-muted mt-1 truncate">{thread.lastMessageText ?? ''}</p>
          </div>
          {thread.unreadCount > 0 && (
            <div className="bg-accent mt-2 size-2 flex-shrink-0 rounded-full">
              <span className="sr-only">{t('chat.unreadCount', { count: thread.unreadCount })}</span>
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
