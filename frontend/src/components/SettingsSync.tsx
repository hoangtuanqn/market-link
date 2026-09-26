import { useEffect, type ReactNode } from 'react';
import SettingsApi from '@/api-requests/settings.requests';
import useSession from '@/hooks/useSession';
import useSettings from '@/hooks/useSettings';
import SettingsStore, { normalize } from '@/lib/settings';

/**
 * - Sign in (or reopen the page while a session exists) → fetch the account's settings, the server copy wins over the one
 *   on the machine.
 * - Language, currency, units, date/time change → rebuild the open page, because format.ts reads settings at render.
 *   Theme does not need it: it is only data-theme on <html>.
 */
const SettingsSync = ({ children }: { children: ReactNode }) => {
  const { user } = useSession();
  const s = useSettings();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    SettingsApi.get()
      .then((res) => {
        if (!cancelled && res.data) SettingsStore.set(normalize(res.data));
      })
      .catch(() => {
        // no network / an old backend without the API → use the copy on the machine
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const key = [s.language, s.currency, s.units, s.dateFormat, s.clock, s.preferredMarket].join('|');
  return (
    <div key={key} className="contents">
      {children}
    </div>
  );
};

export default SettingsSync;
