import { useTranslation } from 'react-i18next';
import ChatPhoto from './ChatPhoto';
import ProductPin from './ProductPin';
import { formatTime } from '@/lib/format';
import type { ChatMessageItem } from '@/types/chat.types';

type Props = {
  message: ChatMessageItem;
  /** A message from the signed-in user: right-aligned, brand background. */
  mine: boolean;
  senderName: string;
  /** Only meaningful for my own message: has the other person read up to here yet. */
  seen?: boolean;
  /** Report the other person's message (FR-116). */
  onReport?: () => void;
  reported?: boolean;
};

/**
 * A chat bubble between two people (FR-110, FR-115). **Not** `ChatMessage` — that one is the AI assistant's and tags
 * every bot reply with an "Intent: …" label (FR-092, spec §10).
 *
 * Composed from the design system's existing `ml-*` classes: `ml-msg`, `ml-msg-bot` (left = the other person),
 * `ml-msg-user` (right = me), `ml-msg-bubble`, `ml-msg-meta`. No new class added, `marketlink-components.css` not
 * touched (frontend/CLAUDE.md).
 */
export default function MessageBubble({ message, mine, senderName, seen, onReport, reported }: Props) {
  const { t } = useTranslation('common');
  const side = mine ? 'ml-msg-user' : 'ml-msg-bot';

  return (
    <div className={`ml-msg ${side} font-sans`} data-testid={`message-${message.id}`}>
      <div className="ml-msg-bubble">
        {message.productId ? (
          <div className="mb-2">
            <ProductPin productId={message.productId} compact />
          </div>
        ) : null}
        {message.kind === 'image' && message.attachment ? (
          <ChatPhoto
            key={message.attachment.attachmentId}
            attachment={message.attachment}
            alt={t('chat.photoFrom', { name: senderName })}
          />
        ) : (
          <span className="break-words whitespace-pre-wrap">{message.body}</span>
        )}
      </div>
      <div className="ml-msg-meta">
        {/* createdAt is ISO; formatClock only accepts "07:30" so here it must be formatTime(Date) */}
        <time dateTime={message.createdAt}>{formatTime(new Date(message.createdAt))}</time>
        {!mine && onReport ? (
          reported ? (
            <span>{t('chat.reported')}</span>
          ) : (
            <button
              type="button"
              className="text-ink-muted underline"
              aria-label={t('chat.reportThis')}
              onClick={onReport}
            >
              {t('chat.report')}
            </button>
          )
        ) : null}
        {mine && seen ? <span>{t('chat.seen')}</span> : null}
      </div>
    </div>
  );
}
