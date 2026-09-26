import { type FormEvent, type KeyboardEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { sendErrorKey } from '@/lib/chat/errors';
import OrderPin from './OrderPin';
import ProductPin from './ProductPin';

type Props = {
  onSend: (text: string, extra?: { productId?: number; orderId?: number }) => Promise<void>;
  onSendPhoto: (file: File) => Promise<void>;
  /** Reports "typing" on every keystroke; the hook filters out extra frames itself (Review Focus #9). */
  onTyping?: (on: boolean) => void;
  disabled: boolean;
  /** A locked button always carries a reason in words (frontend/CLAUDE.md). */
  disabledReason?: string;
  pinnedProductId?: number;
  /** FR-114: the chat was opened from an order — it rides with the first message, like a product pin. */
  pinnedOrderId?: number;
  onUnpin?: () => void;
};

export default function Composer({
  onSend,
  onSendPhoto,
  onTyping,
  disabled,
  disabledReason,
  pinnedProductId,
  pinnedOrderId,
  onUnpin,
}: Props) {
  const { t } = useTranslation('common');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || busy || disabled) return;
    setBusy(true);
    setFailed(null);
    // Cleared right when sending, not waiting for the server: if the user keeps typing while the message is in flight, the new text is not wiped
    setDraft('');
    try {
      await onSend(text, {
        ...(pinnedProductId ? { productId: pinnedProductId } : {}),
        ...(pinnedOrderId ? { orderId: pinnedOrderId } : {}),
      });
      onUnpin?.();
    } catch (error) {
      // Gives the text back so Send can be pressed again, unless the user has already typed something else
      setDraft((current) => (current === '' ? text : current));
      setFailed(t(sendErrorKey(error, 'text')));
    } finally {
      setBusy(false);
    }
  };

  /**
   * Enter sends, Shift+Enter is a new line. An IME (Vietnamese, Japanese…) uses Enter to commit a word: it must not
   * send at that moment.
   */
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    void submit();
  };

  const pickPhoto = async (file: File | undefined) => {
    if (!file || disabled) return;
    setBusy(true);
    setFailed(null);
    try {
      await onSendPhoto(file);
    } catch (error) {
      setFailed(t(sendErrorKey(error, 'photo')));
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return (
    <form onSubmit={submit} className="border-line-strong border-t p-3">
      {disabled && disabledReason ? <p className="text-small text-ink-muted mb-2">{disabledReason}</p> : null}
      {failed ? (
        <p role="alert" className="text-small text-danger mb-2">
          {failed}
        </p>
      ) : null}
      {pinnedProductId || pinnedOrderId ? (
        <div className="bg-surface border-line-strong mb-3 flex items-center gap-2 rounded-md border p-2 shadow-sm">
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-small text-ink-muted block">{t('chat.pinned')}</span>
            {pinnedProductId ? <ProductPin productId={pinnedProductId} compact /> : null}
            {pinnedOrderId ? <OrderPin orderId={pinnedOrderId} compact /> : null}
          </div>
          <Button variant="ghost" size="sm" onClick={onUnpin}>
            {t('chat.unpin')}
          </Button>
        </div>
      ) : null}
      <div className="flex items-end gap-2">
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => void pickPhoto(event.target.files?.[0])}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || busy}
          onClick={() => fileInput.current?.click()}
        >
          {t('chat.attachPhoto')}
        </Button>
        <label className="sr-only" htmlFor="chat-draft">
          {t('chat.draftLabel')}
        </label>
        <textarea
          id="chat-draft"
          rows={1}
          value={draft}
          // Do not lock it while sending: a disabled element loses focus, forcing the user to click again to keep typing
          disabled={disabled}
          onChange={(event) => {
            setDraft(event.target.value);
            onTyping?.(event.target.value.trim().length > 0);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => onTyping?.(false)}
          placeholder={t('chat.draftPlaceholder')}
          className="border-line-strong bg-surface text-ink min-h-10 min-w-0 flex-1 resize-none rounded-2xl border px-3 py-2 font-sans"
        />
        <Button type="submit" size="sm" disabled={disabled || busy || draft.trim().length === 0}>
          {t('chat.send')}
        </Button>
      </div>
    </form>
  );
}
