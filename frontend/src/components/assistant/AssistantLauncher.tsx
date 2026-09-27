import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import { ChatIcon, CloseIcon } from '@/components/icons';
import { USER_ROLE } from '@/constants/enums';
import useSession from '@/hooks/useSession';
import AssistantChat from './AssistantChat';
import { useAssistant } from './assistantContext';

const FULL_PAGE = '/assistant';

/**
 * FR-090, FR-093, FR-094 — the floating assistant button, in all three panels. Shown to any signed-in account the
 * server will let Claude answer: Customer, Farmer and Admin. Hidden on the assistant's own page.
 *
 * Open/closed lives in AssistantProvider rather than here, so a screen can open the panel with a question already typed
 * (the "ask about this" buttons).
 */
const AssistantLauncher = () => {
  const { t } = useTranslation('common');
  const { user } = useSession();
  const { pathname } = useLocation();
  const assistant = useAssistant();

  const open = assistant?.open ?? false;
  const close = assistant?.close;

  useEffect(() => {
    if (!open || !close) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  const allowed =
    user?.role === USER_ROLE.CUSTOMER || user?.role === USER_ROLE.FARMER || user?.role === USER_ROLE.ADMIN;
  if (!assistant || !allowed || pathname === FULL_PAGE) return null;

  return (
    <>
      {open && (
        <section
          role="dialog"
          aria-label={t('chat.assistant')}
          className="bg-surface-raised border-line-strong shadow-pop fixed right-4 bottom-20 z-(--z-dropdown) flex h-[min(560px,calc(100dvh-112px))] w-[min(380px,calc(100vw-32px))] flex-col overflow-hidden rounded-md border-[1.5px]"
        >
          <AssistantChat className="min-h-0 flex-1" />
          <div className="border-line flex justify-end border-t px-4 py-2">
            <Link to={FULL_PAGE} onClick={assistant.close} className="text-small font-bold">
              {t('assistant.fullPage')}
            </Link>
          </div>
        </section>
      )}
      <button
        type="button"
        onClick={assistant.toggle}
        aria-expanded={open}
        aria-label={open ? t('assistant.close') : t('assistant.open')}
        title={open ? t('assistant.close') : t('assistant.open')}
        className="bg-brand text-on-brand hover:bg-brand-strong shadow-pop fixed right-4 bottom-4 z-(--z-dropdown) grid size-14 cursor-pointer place-items-center rounded-full border-0 [&_svg]:size-6"
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>
    </>
  );
};

export default AssistantLauncher;
