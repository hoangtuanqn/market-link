import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'ml-cookie-consent';

const alreadyDecided = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) != null;
  } catch {
    return false;
  }
};

/**
 * A one-time disclosure, not a live toggle: MarketLink sets no advertising or analytics cookies today
 * (docs/prototype/public/privacy.html #sessions), so Accept and Decline both just record the visitor's choice and
 * dismiss the bar — neither changes what loads. Wiring Decline to something real (gating the Leaflet/ OpenStreetMap
 * map, self-hosting the two Google Fonts) is a separate decision the prototype already flags as undecided
 * (docs/prototype/todos.js) — this component only covers the disclosure itself.
 */
const CookieConsentBar = () => {
  const { t } = useTranslation();
  const [hidden, setHidden] = useState(alreadyDecided);

  if (hidden) return null;

  const decide = (choice: 'accepted' | 'declined') => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice, decidedAt: new Date().toISOString() }));
    } catch {
      // private window: stays hidden for this tab only, asks again next visit
    }
    setHidden(true);
  };

  return (
    <div
      role="region"
      aria-label={t('cookieConsent.label')}
      className="border-line-strong bg-surface-raised shadow-float fixed inset-x-0 bottom-0 z-50 border-t-[1.5px] p-5"
    >
      <div className="mx-auto flex max-w-(--size-container) flex-wrap items-center justify-between gap-4">
        <p className="text-body text-ink-muted m-0">
          <Trans
            t={t}
            i18nKey="cookieConsent.text"
            components={{ link: <Link to="/privacy#sessions" className="text-brand underline" /> }}
          />
        </p>
        <div className="flex flex-none items-center gap-3">
          <Button variant="ghost" onClick={() => decide('declined')}>
            {t('cookieConsent.decline')}
          </Button>
          <Button onClick={() => decide('accepted')}>{t('cookieConsent.accept')}</Button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBar;
