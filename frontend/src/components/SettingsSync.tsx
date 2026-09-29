import { useEffect, type ReactNode } from 'react';
import SettingsApi from '@/api-requests/settings.requests';
import useSession from '@/hooks/useSession';
import useSettings from '@/hooks/useSettings';
import SettingsStore, { normalize } from '@/lib/settings';

const SettingsSync = ({ children }: { children: ReactNode }) => {
  const { user } = useSession();
  const s = useSettings();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    SettingsApi.get()
      .then((res) => {
        if (cancelled) return;
        if (res.data) SettingsStore.set(normalize(res.data));
        else SettingsApi.save(SettingsStore.get()).catch(() => undefined);
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
