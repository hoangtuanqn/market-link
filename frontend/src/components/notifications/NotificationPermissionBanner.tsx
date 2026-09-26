import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BellIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import useSession from '@/hooks/useSession';
import { isSupported, permission, requestPermission } from '@/lib/notifications/browser';
import Notification from '@/utils/notification';

const SNOOZE_KEY = 'ml-notify-prompt-snoozed-at';
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

const snoozed = () => {
  try {
    const at = Number(localStorage.getItem(SNOOZE_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
};

/**
 * FR-042 — after sign-in, invite turning on browser notifications. The browser's permission box only shows on clicking
 * Turn on (Safari requires a gesture; Chrome hides the box after repeated denials). "Later" asks again only after 7
 * days.
 */
const NotificationPermissionBanner = () => {
  const { t } = useTranslation();
  const { isLoggedIn } = useSession();
  const [hidden, setHidden] = useState(false);

  if (!isLoggedIn || hidden || !isSupported() || permission() !== 'default' || snoozed()) return null;

  const enable = async () => {
    const result = await requestPermission();
    setHidden(true);
    if (result === 'granted')
      Notification.success({ title: t('notify.prompt.onTitle'), text: t('notify.prompt.onText') });
  };

  const later = () => {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    } catch {
      /* private window: only hidden for this time */
    }
    setHidden(true);
  };

  return (
    <aside
      aria-label={t('notify.prompt.title')}
      className="border-line-strong bg-surface-raised shadow-float fixed right-4 bottom-4 left-4 z-50 flex flex-col gap-3 rounded-md border-[1.5px] p-4 sm:left-auto sm:w-96"
    >
      <div className="flex items-start gap-3">
        <span className="bg-brand-tint text-ink grid size-8 flex-none place-items-center rounded-full">
          <BellIcon size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-bold">{t('notify.prompt.title')}</p>
          <p className="text-small text-ink-muted mt-0.5">{t('notify.prompt.text')}</p>
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={later}>
          {t('notify.prompt.later')}
        </Button>
        <Button size="sm" onClick={() => void enable()}>
          {t('notify.prompt.enable')}
        </Button>
      </div>
    </aside>
  );
};

export default NotificationPermissionBanner;
