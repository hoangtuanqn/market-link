import { type ReactNode, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Composer from './Composer';
import MessageBubble from './MessageBubble';
import { Button } from '@/components/ui/button';
import { DataState } from '@/components/ui/data-state';
import { useConversation } from '@/lib/chat/useChat';
import { chatWhen } from '@/lib/chat/time';
import type { ChatMessageItem, ChatParticipant } from '@/types/chat.types';

type Props = {
  conversationId: number | null;
  other: ChatParticipant | null;
  /** Quay lại danh sách ở màn hẹp (spec §9.2). Nút tự ẩn từ `md`, nơi danh sách và hội thoại nằm cạnh nhau. */
  onBack?: () => void;
  /** Chỗ cho nút riêng của từng vai (Farmer: "Make an offer" ở đợt 2). */
  headerAction?: ReactNode;
};

/**
 * Tin cuối cùng của mình mà đối phương đã đọc tới. So bằng Date, không so chuỗi ISO: backend có lúc trả `.123Z`, có lúc
 * không.
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

export default function ConversationPanel({ conversationId, other, onBack, headerAction }: Props) {
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
  } = useConversation(conversationId);
  const bottom = useRef<HTMLDivElement>(null);
  const newestId = messages.length > 0 ? messages[messages.length - 1].id : null;
  const seenId = lastSeenId(messages, meId, otherReadAt);

  // Chỉ cuộn khi tin MỚI NHẤT đổi: tải trang cũ thêm vào phía trên thì giữ nguyên chỗ đang đọc (Review Focus #2)
  useEffect(() => {
    if (newestId !== null) bottom.current?.scrollIntoView({ block: 'end' });
  }, [newestId]);

  if (conversationId === null || !other) {
    return <DataState fill className="h-full" title={t('chat.pickThreadTitle')} text={t('chat.pickThreadText')} />;
  }

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label={t('chat.conversationWith', { name: other.fullName })}>
      <header className="border-line-strong flex items-center gap-3 border-b p-3">
        {onBack ? (
          <Button variant="secondary" size="sm" onClick={onBack} className="md:hidden">
            {t('chat.back')}
          </Button>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-ink truncate font-sans font-semibold">{other.fullName}</p>
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
            senderName={message.senderId === meId ? t('chat.you') : other.fullName}
            seen={message.id === seenId}
          />
        ))}

        {otherTyping ? (
          <p className="text-small text-ink-muted" aria-live="polite">
            {t('chat.typing', { name: other.fullName })}
          </p>
        ) : null}
        <div ref={bottom} />
      </div>

      <Composer onSend={send} onSendPhoto={sendPhoto} onTyping={typing} disabled={false} />
    </section>
  );
}
