import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ConversationApi from '@/api-requests/conversation.requests';
import type { ChatAttachment } from '@/types/chat.types';

type Props = { attachment: ChatAttachment; alt: string };

/**
 * The JWT travels in the `Authorization` header, not a cookie, so `<img src="/api/v1/attachments/5">` returns 401. Load
 * it with axios and wrap it as a blob URL, and revoke it on leaving the screen — a blob is not cleaned up by itself,
 * and leaving it leaks memory every time an image scrolls by.
 *
 * The caller must pass `key={attachment.attachmentId}`: changing the image makes React remount the component, so state
 * clears itself without needing setState inside an effect (react-hooks/set-state-in-effect).
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
          // Leaving the screen before the blob arrives: revoke right away, do not touch state
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

  // Reserve the exact space the server's size says, so the chat frame does not jump once the image finishes loading
  const ratio = attachment.width && attachment.height ? `${attachment.width} / ${attachment.height}` : '4 / 3';

  return (
    <span className="bg-surface-raised block max-w-[280px] overflow-hidden rounded-md" style={{ aspectRatio: ratio }}>
      {src ? <img src={src} alt={alt} className="h-full w-full object-cover" /> : null}
    </span>
  );
}
