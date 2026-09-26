import { type FormEvent, type KeyboardEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

type Props = {
  onSend: (text: string) => Promise<void>;
  onSendPhoto: (file: File) => Promise<void>;
  /** Báo "đang gõ" mỗi lần chữ đổi; hook tự lọc bớt frame (Review Focus #9). */
  onTyping?: (on: boolean) => void;
  disabled: boolean;
  /** Nút bị khoá luôn kèm lý do bằng chữ (frontend/CLAUDE.md). */
  disabledReason?: string;
};

export default function Composer({ onSend, onSendPhoto, onTyping, disabled, disabledReason }: Props) {
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
    // Xoá ngay lúc gửi chứ không đợi server: người dùng gõ tiếp trong lúc tin đang bay thì chữ mới không bị xoá mất
    setDraft('');
    try {
      await onSend(text);
    } catch {
      // Trả lại chữ để bấm gửi lại, trừ khi người dùng đã gõ sang câu khác
      setDraft((current) => (current === '' ? text : current));
      setFailed(t('chat.sendFailed'));
    } finally {
      setBusy(false);
    }
  };

  /** Enter gửi, Shift+Enter xuống dòng. Bộ gõ IME (tiếng Việt, Nhật…) dùng Enter để chốt chữ: lúc đó không gửi. */
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
    } catch {
      setFailed(t('chat.photoFailed'));
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
          // Không khoá khi đang gửi: phần tử bị disabled mất focus, người dùng phải bấm lại mới gõ tiếp được
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
