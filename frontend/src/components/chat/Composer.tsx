import { type FormEvent, type KeyboardEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { sendErrorKey } from '@/lib/chat/errors';
import { acceptFor, prepareMedia } from '@/lib/chat/media';
import OrderPin from './OrderPin';
import ProductPin from './ProductPin';

type Props = {
  onSend: (text: string, extra?: { productId?: number; orderId?: number }) => Promise<void>;
  onSendMedia: (file: File, options: { onProgress: (percent: number) => void; signal: AbortSignal }) => Promise<void>;
  onTyping?: (on: boolean) => void;
  disabled: boolean;
  disabledReason?: string;
  pinnedProductId?: number;
  pinnedOrderId?: number;
  onUnpin?: () => void;
};

export default function Composer({
  onSend,
  onSendMedia,
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
  const [sending, setSending] = useState<{ phase: 'converting' } | { phase: 'uploading'; percent: number } | null>(
    null,
  );
  const upload = useRef<AbortController | null>(null);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || busy || disabled) return;
    setBusy(true);
    setFailed(null);
    setDraft('');
    try {
      await onSend(text, {
        ...(pinnedProductId ? { productId: pinnedProductId } : {}),
        ...(pinnedOrderId ? { orderId: pinnedOrderId } : {}),
      });
      onUnpin?.();
    } catch (error) {
      setDraft((current) => (current === '' ? text : current));
      setFailed(t(sendErrorKey(error, 'text')));
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    void submit();
  };

  const pickMedia = async (file: File | undefined) => {
    if (!file || disabled) return;
    const controller = new AbortController();
    upload.current = controller;
    setBusy(true);
    setFailed(null);
    try {
      const prepared = await prepareMedia(file, { onConverting: () => setSending({ phase: 'converting' }) });
      if (controller.signal.aborted) return;
      setSending({ phase: 'uploading', percent: 0 });
      await onSendMedia(prepared.file, {
        onProgress: (percent) => setSending({ phase: 'uploading', percent }),
        signal: controller.signal,
      });
    } catch (error) {
      if (!controller.signal.aborted) setFailed(t(sendErrorKey(error, 'media')));
    } finally {
      upload.current = null;
      setSending(null);
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
      {sending ? (
        <div className="mb-2 flex items-center gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-small text-ink-muted" aria-live="polite">
              {sending.phase === 'converting'
                ? t('chat.converting')
                : t('chat.uploading', { percent: sending.percent })}
            </span>
            {sending.phase === 'uploading' ? (
              <div
                role="progressbar"
                aria-label={t('chat.uploadProgress')}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={sending.percent}
                className="bg-surface-sunken h-2 overflow-hidden rounded-full"
              >
                <span className="bg-brand block h-full" style={{ width: `${sending.percent}%` }} />
              </div>
            ) : null}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => upload.current?.abort()}>
            {t('chat.cancelUpload')}
          </Button>
        </div>
      ) : null}
      <div className="flex items-end gap-2">
        <input
          ref={fileInput}
          type="file"
          accept={acceptFor(navigator)}
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => void pickMedia(event.target.files?.[0])}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || busy}
          onClick={() => fileInput.current?.click()}
        >
          {t('chat.attachMedia')}
        </Button>
        <label className="sr-only" htmlFor="chat-draft">
          {t('chat.draftLabel')}
        </label>
        <textarea
          id="chat-draft"
          rows={1}
          value={draft}
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
