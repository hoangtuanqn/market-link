import { useTranslation } from 'react-i18next';
import SettingsApi from '@/api-requests/settings.requests';
import useSession from '@/hooks/useSession';
import useSettings from '@/hooks/useSettings';
import SettingsStore, { LANGUAGES, type Language } from '@/lib/settings';

/**
 * Chọn ngôn ngữ ở footer: ai cũng đổi được, kể cả khách chưa đăng nhập. Đã đăng nhập thì lưu luôn vào tài khoản, giống
 * mục Language trong Settings.
 */
const LanguageSwitcher = () => {
  const { t } = useTranslation();
  const { language } = useSettings();
  const { isLoggedIn } = useSession();

  const change = (code: Language) => {
    SettingsStore.set({ language: code });
    if (isLoggedIn) SettingsApi.save(SettingsStore.get()).catch(() => undefined);
  };

  return (
    <label className="text-board-muted inline-flex items-center gap-2 text-[13px]">
      <span>{t('settings.language')}</span>
      <select
        value={language}
        onChange={(e) => change(e.target.value as Language)}
        className="bg-board text-on-board border-board-muted focus-visible:outline-on-board min-h-9 cursor-pointer rounded-sm border-[1.5px] px-2 text-[13px] focus-visible:outline-2 focus-visible:outline-offset-1"
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
