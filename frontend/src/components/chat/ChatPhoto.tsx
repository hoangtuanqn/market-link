import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ConversationApi from '@/api-requests/conversation.requests';
import type { ChatAttachment } from '@/types/chat.types';

type Props = { attachment: ChatAttachment; alt: string };

/**
 * JWT đi ở header `Authorization`, không ở cookie, nên `<img src="/api/v1/attachments/5">` trả 401. Tải bằng axios rồi
 * bọc thành blob URL, và thu hồi lúc rời màn — blob không tự dọn, để lâu là rò bộ nhớ mỗi lần cuộn qua một bức ảnh.
 *
 * Người gọi phải truyền `key={attachment.attachmentId}`: đổi ảnh thì React dựng lại component, nên state tự sạch mà
 * không cần setState trong effect (react-hooks/set-state-in-effect).
 */
export default function ChatPhoto({ attachment, alt }: Props) {
  const { t } = useTranslation('common');
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    let alive = true;

    ConversationApi.photoBlob(attachment.attachmentId)
      .then((blobUrl) => {
        if (alive) {
          url = blobUrl;
          setSrc(blobUrl);
        } else {
          // Rời màn trước khi blob về: thu hồi ngay, đừng chạm state
          URL.revokeObjectURL(blobUrl);
        }
      })
      .catch(() => {
        if (alive) setFailed(true);
      });

    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [attachment.attachmentId]);

  if (failed) {
    return (
      <span className="text-small text-ink-muted border-line-strong block rounded-md border p-3">
        {t('chat.photoUnavailable')}
      </span>
    );
  }

  // Chừa đúng chỗ theo kích thước server trả về, để khung chat không giật khi ảnh tải xong
  const ratio = attachment.width && attachment.height ? `${attachment.width} / ${attachment.height}` : '4 / 3';

  return (
    <span className="bg-surface-raised block max-w-[280px] overflow-hidden rounded-md" style={{ aspectRatio: ratio }}>
      {src ? <img src={src} alt={alt} className="h-full w-full object-cover" /> : null}
    </span>
  );
}
