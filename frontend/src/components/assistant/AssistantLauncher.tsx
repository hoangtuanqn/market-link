import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import { ChatIcon, CloseIcon } from '@/components/icons';
import { USER_ROLE } from '@/constants/enums';
import useSession from '@/hooks/useSession';
import AssistantChat from './AssistantChat';

const FULL_PAGE = '/assistant';

/**
 * FR-090 — the floating assistant button of the customer panel (MainLayout). Only for signed-in customer-panel accounts
 * (Customer, and a Farmer shopping as a customer), the same ones the server lets Claude answer; hidden on the
 * assistant's own page.
 */
const AssistantLauncher = () => {
  const { t } = useTranslation('common');
  const { user } = useSession();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const allowed = user?.role === USER_ROLE.CUSTOMER || user?.role === USER_ROLE.FARMER;
  if (!allowed || pathname === FULL_PAGE) return null;

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
            <Link to={FULL_PAGE} onClick={() => setOpen(false)} className="text-small font-bold">
              {t('assistant.fullPage')}
            </Link>
          </div>
        </section>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
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
