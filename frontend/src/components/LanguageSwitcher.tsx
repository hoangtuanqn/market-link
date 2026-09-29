import { useTranslation } from 'react-i18next';
import SettingsApi from '@/api-requests/settings.requests';
import useSession from '@/hooks/useSession';
import useSettings from '@/hooks/useSettings';
import SettingsStore, { LANGUAGES, type Language } from '@/lib/settings';

import Helper from '@/utils/helper';

type LanguageSwitcherProps = {
  variant?: 'dark' | 'light';
};

const LanguageSwitcher = ({ variant = 'dark' }: LanguageSwitcherProps) => {
  const { t } = useTranslation();
  const { language } = useSettings();
  const { isLoggedIn } = useSession();

  const change = (code: Language) => {
    SettingsStore.set({ language: code });
    if (isLoggedIn) SettingsApi.save(SettingsStore.get()).catch(() => undefined);
  };

  const isLight = variant === 'light';

  return (
    <label
      className={Helper.cn(
        'inline-flex items-center gap-2 text-[13px]',
        isLight ? 'text-ink-muted' : 'text-board-muted',
      )}
    >
      <span>{t('settings.language')}</span>
      <select
        value={language}
        onChange={(e) => change(e.target.value as Language)}
        className={Helper.cn(
          'min-h-11 cursor-pointer rounded-sm border-[1.5px] px-2 text-[13px] focus-visible:outline-2 focus-visible:outline-offset-1',
          isLight
            ? 'border-line bg-surface-raised text-ink focus-visible:outline-ink'
            : 'border-board-muted bg-board text-on-board focus-visible:outline-on-board',
        )}
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} lang={l.code}>
            {l.name}
          </option>
        ))}
      </select>
    </label>
  );
};

export default LanguageSwitcher;
