import { useTranslation } from 'react-i18next';
import ChatPhoto from './ChatPhoto';
import { formatTime } from '@/lib/format';
import type { ChatMessageItem } from '@/types/chat.types';

type Props = {
  message: ChatMessageItem;
  /** Tin của người đang đăng nhập: căn phải, nền brand. */
  mine: boolean;
  senderName: string;
  /** Chỉ có nghĩa với tin của mình: người kia đã đọc tới đây chưa. */
  seen?: boolean;
};

/**
 * Bong bóng chat giữa hai con người (FR-110, FR-115). **Không phải** `ChatMessage` — cái đó là của trợ lý AI và bắt mỗi
 * câu bot kèm nhãn "Intent: …" (FR-092, spec §10).
 *
 * Ghép từ class `ml-*` đã có của design system: `ml-msg`, `ml-msg-bot` (trái = người kia), `ml-msg-user` (phải = mình),
 * `ml-msg-bubble`, `ml-msg-meta`. Không thêm class mới, không sửa `marketlink-components.css` (frontend/CLAUDE.md).
 */
export default function MessageBubble({ message, mine, senderName, seen }: Props) {
  const { t } = useTranslation('common');
  const side = mine ? 'ml-msg-user' : 'ml-msg-bot';

  return (
    <div className={`ml-msg ${side} font-sans`} data-testid={`message-${message.id}`}>
      <div className="ml-msg-bubble">
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
        {/* createdAt là ISO; formatClock chỉ nhận "07:30" nên ở đây phải là formatTime(Date) */}
        <time dateTime={message.createdAt}>{formatTime(new Date(message.createdAt))}</time>
        {mine && seen ? <span>{t('chat.seen')}</span> : null}
      </div>
    </div>
  );
}
