import { useTranslation } from 'react-i18next';
import ChatPhoto from './ChatPhoto';
import ChatVideo from './ChatVideo';
import OrderPin from './OrderPin';
import ProductPin from './ProductPin';
import { formatTime } from '@/lib/format';
import type { ChatMessageItem } from '@/types/chat.types';

type Props = {
  message: ChatMessageItem;
  mine: boolean;
  senderName: string;
  seen?: boolean;
  onReport?: () => void;
  reported?: boolean;
};

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
        {message.orderId ? (
          <div className="mb-2">
            <OrderPin orderId={message.orderId} compact />
          </div>
        ) : null}
        {message.kind === 'image' && message.attachment ? (
          <ChatPhoto
            key={message.attachment.attachmentId}
            attachment={message.attachment}
            alt={t('chat.photoFrom', { name: senderName })}
          />
        ) : message.kind === 'video' && message.attachment ? (
          <ChatVideo
            key={message.attachment.attachmentId}
            attachmentId={message.attachment.attachmentId}
            label={t('chat.videoFrom', { name: senderName })}
          />
        ) : (
          <span className="break-words whitespace-pre-wrap">{message.body}</span>
        )}
      </div>
      <div className="ml-msg-meta">
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
