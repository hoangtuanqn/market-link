import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Composer from './Composer';
import MessageBubble from './MessageBubble';
import ReportDialog from './ReportDialog';
import { Button } from '@/components/ui/button';
import { DataState } from '@/components/ui/data-state';
import { useConversation } from '@/lib/chat/useChat';
import { displayName } from '@/lib/chat/names';
import { chatWhen } from '@/lib/chat/time';
import type { ChatMessageItem, ConversationSummary } from '@/types/chat.types';
import Notification from '@/utils/notification';

type Props = {
  conversationId: number | null;
  thread: ConversationSummary | null;
  /**
   * Back to the list on a narrow screen (spec §9.2). The button hides itself from `md` up, where the list and the
   * conversation sit side by side.
   */
  onBack?: () => void;
  /** A slot for each role's own button (Farmer: "Make an offer" in phase 2). */
  headerAction?: ReactNode;
  pinnedProductId?: number;
  onUnpin?: () => void;
};

/**
 * The last message of mine that the other person has read up to. Compared as a Date, not as an ISO string: the backend
 * sometimes returns `.123Z`, sometimes not.
 */
const lastSeenId = (messages: ChatMessageItem[], meId: number | null, otherReadAt: string | null) => {
  if (!otherReadAt || meId === null) return null;
  const readAt = new Date(otherReadAt).getTime();
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.senderId === meId && new Date(m.createdAt).getTime() <= readAt) return m.id;
  }
  return null;
};

export default function ConversationPanel({
  conversationId,
  thread,
  onBack,
  headerAction,
  pinnedProductId,
  onUnpin,
}: Props) {
  const other = thread?.other;
  const { t } = useTranslation('common');
  const {
    messages,
    loading,
    error,
    hasMore,
    loadOlder,
    olderError,
    send,
    sendPhoto,
    typing,
    otherTyping,
    otherReadAt,
    meId,
  } = useConversation(conversationId, { otherReadAt: thread?.otherReadAt });
  const bottom = useRef<HTMLDivElement>(null);
  const [reportingId, setReportingId] = useState<number | null>(null);
  const [reportedIds, setReportedIds] = useState<Set<number>>(new Set());
  const newestId = messages.length > 0 ? messages[messages.length - 1].id : null;
  const seenId = lastSeenId(messages, meId, otherReadAt);

  // Only scrolls when the NEWEST message changes: loading an older page adds it above and keeps the current reading spot (Review Focus #2)
  useEffect(() => {
    if (newestId !== null) bottom.current?.scrollIntoView({ block: 'end' });
  }, [newestId]);

  if (conversationId === null || !other) {
    return <DataState fill className="h-full" title={t('chat.pickThreadTitle')} text={t('chat.pickThreadText')} />;
  }

  return (
    <section
      className="flex h-full min-h-0 flex-col"
      aria-label={t('chat.conversationWith', { name: displayName(other) })}
    >
      <header className="border-line-strong flex items-center gap-3 border-b p-3">
        {onBack ? (
          <Button variant="secondary" size="sm" onClick={onBack} className="md:hidden">
            {t('chat.back')}
          </Button>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-ink truncate font-sans font-semibold">{displayName(other)}</p>
          <p className="text-small text-ink-muted">
            {other.online
              ? t('chat.online')
              : other.lastSeenAt
                ? t('chat.lastSeen', { time: chatWhen(other.lastSeenAt) })
                : t('chat.offline')}
          </p>
        </div>
        {headerAction}
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        {hasMore ? (
          <Button variant="secondary" size="sm" onClick={() => void loadOlder()} className="self-center">
            {t('chat.loadOlder')}
          </Button>
        ) : null}
        {olderError ? (
          <p role="alert" className="text-small text-ink-muted self-center">
            {t('chat.olderFailed')}
          </p>
        ) : null}

        {loading ? (
          <p role="status" className="text-small text-ink-muted">
            {t('chat.loadingMessages')}
          </p>
        ) : null}

        {error ? (
          <DataState variant="error" title={t('chat.messagesErrorTitle')} text={t('chat.messagesErrorText')} />
        ) : null}

        {!loading && !error && messages.length === 0 ? (
          <DataState title={t('chat.emptyThreadTitle')} text={t('chat.emptyThreadText')} />
        ) : null}

        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            mine={message.senderId === meId}
            senderName={message.senderId === meId ? t('chat.you') : displayName(other)}
            seen={message.id === seenId}
            onReport={message.senderId !== meId ? () => setReportingId(message.id) : undefined}
            reported={reportedIds.has(message.id)}
          />
        ))}

        {otherTyping ? (
          <p className="text-small text-ink-muted" aria-live="polite">
            {t('chat.typing', { name: displayName(other) })}
          </p>
        ) : null}
        <div ref={bottom} />
      </div>

      <Composer
        onSend={send}
        onSendPhoto={sendPhoto}
        onTyping={typing}
        disabled={false}
        pinnedProductId={pinnedProductId}
        onUnpin={onUnpin}
      />
      <ReportDialog
        key={reportingId ?? 'none'}
        messageId={reportingId}
        onClose={() => setReportingId(null)}
        onReported={(id) => {
          setReportedIds((s) => new Set(s).add(id));
          setReportingId(null);
          Notification.success({ text: t('chat.reportThanks') });
        }}
      />
    </section>
  );
}
